"""Wallet performance profiler: P&L, win-rate, Sharpe, and conviction scoring."""

from __future__ import annotations

import json
import logging
import time
from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import requests

from .config import PolymarketConfig
from .state import StateManager, WalletScore
from .utils import sharpe_ratio, win_rate

logger = logging.getLogger("polymarket-tracker")

DEFAULT_SUBGRAPH = (
    "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/"
    "subgraphs/orderbook-subgraph/0.0.1/gn"
)

DEFAULT_POLYNODE_BASE = "https://api.polynode.dev/v1"


def _decimal(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


@dataclass(frozen=True)
class TradeEvent:
    token_id: str
    side: str
    shares: Decimal
    price: Decimal
    timestamp: float
    amount_usd: Decimal
    tx_hash: str


def _coerce_trade(raw: Dict[str, Any]) -> Optional[TradeEvent]:
    """Normalize a trade dict from subgraph / API / local store."""
    try:
        side = str(raw.get("side", "")).upper()
        if side not in ("BUY", "SELL"):
            return None
        shares = _decimal(raw.get("shares", raw.get("amount", 0)))
        price = _decimal(raw.get("price", 0))
        if shares <= 0 or price < 0:
            return None
        ts_raw = raw.get("timestamp", raw.get("ts_unix", time.time()))
        if isinstance(ts_raw, str) and ts_raw.isdigit():
            ts = int(ts_raw)
        elif isinstance(ts_raw, (int, float)):
            ts = float(ts_raw)
        else:
            ts = time.time()
        if ts > 1e12:
            ts = ts / 1000.0
        return TradeEvent(
            token_id=str(raw.get("token", raw.get("token_id", ""))),
            side=side,
            shares=shares,
            price=price,
            timestamp=ts,
            amount_usd=shares * price,
            tx_hash=str(raw.get("transaction_hash", raw.get("tx_hash", ""))),
        )
    except Exception as exc:
        logger.debug("Failed to coerce trade: %s", exc)
        return None


def _realized_pnl_and_returns(trades: List[TradeEvent]) -> Tuple[Decimal, List[Decimal], int, int]:
    """FIFO realized P&L and per-closed-trade returns."""
    buys: Dict[str, List[Tuple[Decimal, Decimal]]] = defaultdict(list)
    realized = Decimal("0")
    returns: List[Decimal] = []
    wins = 0
    losses = 0

    for t in sorted(trades, key=lambda x: x.timestamp):
        token = t.token_id
        if t.side == "BUY":
            buys[token].append((t.shares, t.price))
            continue
        remaining = t.shares
        sell_price = t.price
        while remaining > 0 and buys[token]:
            lot_shares, lot_price = buys[token][0]
            matched = min(remaining, lot_shares)
            trade_return = safe_pnl_return(lot_price, sell_price)
            returns.append(trade_return)
            if sell_price > lot_price:
                wins += 1
            elif sell_price < lot_price:
                losses += 1
            realized += (sell_price - lot_price) * matched
            remaining -= matched
            if matched >= lot_shares:
                buys[token].pop(0)
            else:
                buys[token][0] = (lot_shares - matched, lot_price)

    return realized, returns, wins, losses


def safe_pnl_return(buy_price: Decimal, sell_price: Decimal) -> Decimal:
    if buy_price <= 0:
        return Decimal("0")
    return ((sell_price - buy_price) / buy_price).quantize(Decimal("0.0001"))


class WalletProfiler:
    """Fetch wallet trade history and compute a hardened performance score."""

    def __init__(self, config: PolymarketConfig, state: StateManager) -> None:
        self._config = config
        self._state = state
        self._subgraph_url = config.subgraph_url or DEFAULT_SUBGRAPH

    def _subgraph_query(self, wallet: str, since: Optional[float] = None) -> List[Dict[str, Any]]:
        try:
            since_ms = int((since or (time.time() - 30 * 86400)) * 1000)
            query = {
                "query": (
                    "query GetWalletTrades($wallet: String!, $since: BigInt!) {"
                    "  trades(\n"
                    "    where: { user: $wallet, timestamp_gte: $since }\n"
                    "    orderBy: timestamp\n"
                    "    orderDirection: desc\n"
                    "    first: 1000\n"
                    "  ) {\n"
                    "    id\n"
                    "    token\n"
                    "    amount\n"
                    "    price\n"
                    "    timestamp\n"
                    "    side\n"
                    "    user\n"
                    "  }\n"
                    "}"
                ),
                "variables": {"wallet": wallet.lower(), "since": str(since_ms)},
            }
            resp = requests.post(
                self._subgraph_url,
                json=query,
                timeout=10,
                headers={"Content-Type": "application/json"},
            )
            if not resp.ok:
                logger.warning("Subgraph HTTP %s for wallet %s", resp.status_code, wallet)
                return []
            data = resp.json()
            if not data or "data" not in data:
                return []
            return data["data"].get("trades", [])
        except Exception as exc:
            logger.warning("Subgraph fetch failed for %s: %s", wallet, exc)
            return []

    def _polynode_wallet_trades(self, wallet: str) -> List[Dict[str, Any]]:
        if not self._config.polynode_api_key:
            return []
        try:
            url = f"{DEFAULT_POLYNODE_BASE}/clobv2/wallets/{wallet.lower()}/trades"
            headers = {"Authorization": f"Bearer {self._config.polynode_api_key}"}
            resp = requests.get(url, headers=headers, timeout=10)
            if not resp.ok:
                return []
            data = resp.json()
            return data.get("trades", [])
        except Exception as exc:
            logger.warning("PolyNode fetch failed for %s: %s", wallet, exc)
            return []

    def _local_trades(self, wallet: str, since: Optional[float] = None) -> List[Dict[str, Any]]:
        rows = self._state.get_wallet_trades(wallet, since=since)
        for r in rows:
            r["shares"] = r.get("amount_usd", 0) / max(r.get("price", 0), 0.0001)
        return rows

    def fetch_trades(self, wallet: str, since: Optional[float] = None) -> List[TradeEvent]:
        """Aggregate trades from all configured sources, de-duplicate by tx+token+side."""
        raw: List[Dict[str, Any]] = []

        if self._config.subgraph_url:
            raw.extend(self._subgraph_query(wallet, since))

        if self._config.polynode_api_key:
            raw.extend(self._polynode_wallet_trades(wallet))

        raw.extend(self._local_trades(wallet, since))

        seen: set = set()
        trades: List[TradeEvent] = []
        for item in raw:
            te = _coerce_trade(item)
            if not te:
                continue
            key = (te.tx_hash, te.token_id, te.side, str(te.shares), str(te.price))
            if key in seen:
                continue
            seen.add(key)
            trades.append(te)

        return trades

    def compute_score(self, wallet: str, since: Optional[float] = None) -> WalletScore:
        since_ts = since or (time.time() - 30 * 86400)
        trades = self.fetch_trades(wallet, since=since_ts)

        if not trades:
            return WalletScore(
                address=wallet.lower(),
                profit_usd=Decimal("0"),
                win_rate=Decimal("0"),
                sharpe=Decimal("0"),
                total_trades=0,
                wins=0,
                losses=0,
                conviction="NO_DATA",
                last_updated=time.time(),
            )

        total_volume = sum(t.amount_usd for t in trades)
        total_trades = len(trades)
        realized, returns, wins, losses = _realized_pnl_and_returns(trades)

        wr = win_rate(wins, wins + losses) if (wins + losses) else Decimal("0")
        sr = sharpe_ratio(returns)

        # Conviction: low frequency, high volume relative to average = high conviction.
        avg_trade = total_volume / Decimal(total_trades) if total_trades else Decimal("0")
        conviction = "LOW"
        if total_trades <= 5:
            conviction = "HOLDING"
        elif avg_trade >= Decimal("1000") and total_trades <= 60:
            conviction = "HIGH"
        elif avg_trade >= Decimal("100") and total_trades <= 100:
            conviction = "MEDIUM"

        score = WalletScore(
            address=wallet.lower(),
            profit_usd=realized.quantize(Decimal("0.01")),
            win_rate=wr,
            sharpe=sr,
            total_trades=total_trades,
            wins=wins,
            losses=losses,
            conviction=conviction,
            last_updated=time.time(),
        )
        self._state.upsert_wallet_score(score)
        return score

    def passes_filter(self, score: WalletScore) -> bool:
        """Return True if the wallet meets the high-performance criteria."""
        if self._config.whitelist_only:
            return self._state.is_watched(score.address)
        if score.profit_usd < self._config.min_wallet_profit_usd:
            return False
        if score.win_rate < self._config.min_win_rate_pct:
            return False
        if score.sharpe < self._config.min_sharpe_ratio:
            return False
        return True

    def status(self) -> Dict[str, Any]:
        return {
            "subgraph_url": self._subgraph_url,
            "sources": [
                *(["subgraph"] if self._config.subgraph_url else []),
                *(["polynode"] if self._config.polynode_api_key else []),
                "local",
            ],
        }
