"""Historical backtest engine for the Polymarket smart-wallet copy strategy.

Uses real, public data only:
  - Goldsky orderbook subgraph for historical OrderFilled events
  - Polymarket CLOB closed-market list for token outcomes and winners
  - Polymarket CLOB prices-history for optional signal-confluence filtering

The engine evaluates what would have happened if it copied fixed-$50 BUY fills
from watched wallets that pass the performance filter.

No mock data is used; all fills, prices, and resolutions are fetched from live
public endpoints.
"""

from __future__ import annotations

import argparse
import logging
import os
import statistics
import sys
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import requests

# Allow direct script execution while preserving package imports.
if __name__ == "__main__" and __package__ is None:
    _repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    sys.path.insert(0, _repo_root)
    __package__ = "runtime.polymarket"

from .abi import derive_price_from_fill, derive_usd_notional
from .config import PolymarketConfig
from .signals import SignalConfluence

logger = logging.getLogger("polymarket-tracker")

GOLDSKY_SUBGRAPH = "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn"
CLOB_CLOSED_MARKETS = "https://clob.polymarket.com/markets"
CLOB_MARKETS_BY_TOKEN = "https://clob.polymarket.com/markets-by-token/{token_id}"
CLOB_MARKET_BY_CONDITION = "https://clob.polymarket.com/markets/{condition_id}"
CLOB_PRICES_HISTORY = "https://clob.polymarket.com/prices-history"

SUBGRAPH_PAGE_SIZE = 1000


@dataclass(frozen=True)
class BacktestTrade:
    wallet: str
    token_id: str
    outcome: str
    slug: str
    side: str
    entry_price: Decimal
    exit_price: Decimal
    shares: Decimal
    notional_usd: Decimal
    pnl: Decimal
    roi: Decimal
    timestamp: int
    tx_hash: str
    confluence_score: Decimal
    confluence_confidence: Decimal


class MarketOracle:
    """Resolve token IDs to market outcomes and settlement prices."""

    def __init__(self) -> None:
        self._cache: Dict[str, Dict[str, Any]] = {}

    def load_closed_markets(self, limit: int = 1000) -> None:
        try:
            resp = requests.get(
                CLOB_CLOSED_MARKETS, params={"closed": "true", "limit": limit}, timeout=60
            )
            resp.raise_for_status()
            for market in resp.json().get("data", []):
                for token in market.get("tokens", []):
                    token_id = token.get("token_id", "").lower()
                    if not token_id:
                        continue
                    self._cache[token_id] = {
                        "condition_id": market.get("condition_id", ""),
                        "slug": market.get("market_slug", ""),
                        "outcome": token.get("outcome", ""),
                        "winner": token.get("winner", False),
                        "price": Decimal(str(token.get("price", 0) or 0)),
                    }
            logger.info("Loaded %d closed-market tokens into oracle", len(self._cache))
        except Exception as exc:
            logger.warning("Failed to load closed markets: %s", exc)

    def resolve(self, token_id: str) -> Optional[Dict[str, Any]]:
        token_id = token_id.lower()
        if token_id in self._cache:
            return self._cache[token_id]
        try:
            by_token = requests.get(
                CLOB_MARKETS_BY_TOKEN.format(token_id=token_id), timeout=20
            ).json()
            condition_id = by_token.get("condition_id")
            if not condition_id:
                return None
            market = requests.get(
                CLOB_MARKET_BY_CONDITION.format(condition_id=condition_id), timeout=20
            ).json()
            for token in market.get("tokens", []):
                tid = token.get("token_id", "").lower()
                if tid:
                    self._cache[tid] = {
                        "condition_id": condition_id,
                        "slug": market.get("market_slug", ""),
                        "outcome": token.get("outcome", ""),
                        "winner": token.get("winner", False),
                        "price": Decimal(str(token.get("price", 0) or 0)),
                    }
            return self._cache.get(token_id)
        except Exception as exc:
            logger.warning("Could not resolve token %s: %s", token_id[:16], exc)
            return None

    def exit_price(self, token_id: str) -> Optional[Decimal]:
        info = self.resolve(token_id)
        if not info:
            return None
        if info.get("winner"):
            return Decimal("1")
        # If the market is closed but this token is not the winner, it expires at 0.
        # For active markets we cannot realize P&L.
        return Decimal("0") if info.get("slug") else None


class SubgraphLoader:
    """Load historical OrderFilled events for one or more wallets."""

    def __init__(self, endpoint: str = GOLDSKY_SUBGRAPH) -> None:
        self.endpoint = endpoint

    def _page(
        self,
        start_ts: int,
        end_ts: int,
        wallets: List[str],
        side_field: str,
        id_gt: str = "",
        page_size: int = SUBGRAPH_PAGE_SIZE,
    ) -> List[Dict[str, Any]]:
        wallet_clause = ""
        if wallets:
            wallet_list = ", ".join(f'"{w.lower()}"' for w in wallets if w)
            wallet_clause = f"{side_field}_in: [{wallet_list}], "
        id_clause = f'id_gt: "{id_gt}", ' if id_gt else ""
        query = f"""
        {{
          orderFilledEvents(
            first: {page_size},
            where: {{ {wallet_clause}{id_clause}timestamp_gt: {start_ts}, timestamp_lt: {end_ts} }},
            orderBy: timestamp,
            orderDirection: asc
          ) {{
            id
            timestamp
            transactionHash
            maker
            taker
            makerAssetId
            takerAssetId
            makerAmountFilled
            takerAmountFilled
            fee
          }}
        }}
        """
        try:
            resp = requests.post(
                self.endpoint,
                json={"query": query},
                headers={"Content-Type": "application/json"},
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("errors"):
                msg = str(data["errors"])
                # Retry on subgraph store timeouts by halving page size.
                if "timeout" in msg.lower() or "statement timeout" in msg.lower():
                    if page_size > 10:
                        logger.warning("Subgraph timeout; retrying with page size %d", page_size // 2)
                        return self._page(start_ts, end_ts, wallets, side_field, id_gt, page_size // 2)
                logger.warning("Subgraph errors: %s", data["errors"])
                return []
            return data.get("data", {}).get("orderFilledEvents", [])
        except Exception as exc:
            logger.warning("Subgraph fetch failed for %s: %s", side_field or "all", exc)
            return []

    def fetch_fills(
        self, wallets: List[str], start_ts: int, end_ts: int, first: int = 1000
    ) -> List[Dict[str, Any]]:
        combined: List[Dict[str, Any]] = []
        # Wallet-specific filters stress the subgraph; use smaller pages.
        page_size = SUBGRAPH_PAGE_SIZE if not wallets else min(200, SUBGRAPH_PAGE_SIZE)
        if wallets:
            for side_field in ("maker", "taker"):
                id_gt = ""
                pages = 0
                max_pages = max(1, first // page_size) + 1
                while pages < max_pages:
                    page = self._page(start_ts, end_ts, wallets, side_field, id_gt, page_size=page_size)
                    if not page:
                        break
                    combined.extend(page)
                    id_gt = page[-1]["id"]
                    pages += 1
                    if len(page) < page_size:
                        break
        else:
            id_gt = ""
            pages = 0
            max_pages = max(1, first // SUBGRAPH_PAGE_SIZE) + 1
            while pages < max_pages:
                page = self._page(start_ts, end_ts, [], "", id_gt)
                if not page:
                    break
                combined.extend(page)
                id_gt = page[-1]["id"]
                pages += 1
                if len(page) < SUBGRAPH_PAGE_SIZE:
                    break

        seen: set = set()
        merged: List[Dict[str, Any]] = []
        for fill in combined:
            key = fill.get("id") or f"{fill.get('transactionHash')}:{fill.get('timestamp')}"
            if key in seen:
                continue
            seen.add(key)
            merged.append(fill)
        merged.sort(key=lambda x: int(x.get("timestamp", 0)))
        # Respect the requested `first` count across both sides.
        return merged[:first]


def _normalize_fill(event: Dict[str, Any], wallet: str) -> Optional[Dict[str, Any]]:
    """Turn a raw subgraph event into a normalized fill dict.

    Polymarket CTF V2 always uses assetId "0" for the collateral leg (USDC/pUSD)
    and the non-zero assetId for the outcome-token leg.  The wallet is BUYING the
    outcome token when it supplies the collateral leg, and SELLING when it supplies
    the outcome-token leg.
    """
    maker_asset = event.get("makerAssetId", "")
    taker_asset = event.get("takerAssetId", "")
    maker_amt = int(event.get("makerAmountFilled", 0) or 0)
    taker_amt = int(event.get("takerAmountFilled", 0) or 0)

    if maker_asset == "0" and taker_asset != "0":
        collateral = maker_amt
        shares = taker_amt
        token_id = taker_asset
        wallet_side = "BUY" if wallet == event["maker"].lower() else "SELL"
    elif taker_asset == "0" and maker_asset != "0":
        collateral = taker_amt
        shares = maker_amt
        token_id = maker_asset
        wallet_side = "BUY" if wallet == event["taker"].lower() else "SELL"
    else:
        # Neg-risk or malformed; skip.
        return None

    if collateral == 0 or shares == 0:
        return None

    normalized = {
        "transaction_hash": event.get("transactionHash", ""),
        "timestamp": int(event.get("timestamp", 0)),
        "wallet": wallet,
        "maker": event.get("maker", "").lower(),
        "taker": event.get("taker", "").lower(),
        "token_id": token_id.lower(),
        "maker_amount": collateral,
        "taker_amount": shares,
        "side": "BUY",  # normalized: maker_amount is always collateral, taker_amount shares
        "wallet_side": wallet_side,
        "fee": int(event.get("fee", 0) or 0),
    }
    normalized["price"] = float(derive_price_from_fill(normalized))
    normalized["amount_usd"] = float(derive_usd_notional(normalized))
    return normalized


@dataclass
class WalletStats:
    wallet: str
    trades: int
    wins: int
    pnl: Decimal
    win_rate: Decimal
    sharpe: Decimal


class BacktestWalletProfiler:
    """Compute per-wallet performance from closed historical trades."""

    def __init__(self, oracle: MarketOracle, include_sell: bool = False) -> None:
        self._oracle = oracle
        self._include_sell = include_sell

    def profile(self, fills: List[Dict[str, Any]]) -> Dict[str, WalletStats]:
        by_wallet: Dict[str, List[Decimal]] = {}
        by_wallet_pnl: Dict[str, Decimal] = {}
        by_wallet_wins: Dict[str, int] = {}
        for fill in fills:
            wallet = fill["wallet"]
            if fill.get("wallet_side") != "BUY" and not self._include_sell:
                continue
            exit_p = self._oracle.exit_price(fill["token_id"])
            if exit_p is None:
                continue
            entry_p = Decimal(str(fill["price"]))
            shares = Decimal(str(fill["amount_usd"])) / entry_p if entry_p else Decimal("0")
            pnl = (exit_p - entry_p) * shares
            by_wallet.setdefault(wallet, []).append(pnl)
            by_wallet_pnl[wallet] = by_wallet_pnl.get(wallet, Decimal("0")) + pnl
            by_wallet_wins[wallet] = by_wallet_wins.get(wallet, 0) + (1 if pnl > 0 else 0)

        stats: Dict[str, WalletStats] = {}
        for wallet, pnls in by_wallet.items():
            wins = by_wallet_wins[wallet]
            total = len(pnls)
            win_rate = (Decimal(wins) / Decimal(total) * 100).quantize(Decimal("0.01")) if total else Decimal("0")
            sharpe = Decimal("0")
            if len(pnls) > 1:
                try:
                    mean = statistics.mean([float(p) for p in pnls])
                    std = statistics.stdev([float(p) for p in pnls])
                    if std:
                        sharpe = Decimal(str(mean / std)).quantize(Decimal("0.001"))
                except statistics.StatisticsError:
                    pass
            stats[wallet] = WalletStats(
                wallet=wallet, trades=total, wins=wins, pnl=by_wallet_pnl[wallet],
                win_rate=win_rate, sharpe=sharpe,
            )
        return stats


class WalkForwardBacktest:
    """Backtest the copy strategy on closed markets using real historical fills."""

    def __init__(
        self,
        wallets: List[str],
        config: Optional[PolymarketConfig] = None,
        fixed_order_usd: Decimal = Decimal("50"),
        starting_bankroll: Decimal = Decimal("1000"),
        position_size_pct: Optional[Decimal] = None,
        min_wallet_profit: Decimal = Decimal("10000"),
        min_wallet_win_rate: Decimal = Decimal("65"),
        min_wallet_sharpe: Decimal = Decimal("1"),
        use_confluence: bool = False,
        include_sell: bool = False,
        contrarian: bool = False,
    ) -> None:
        self.wallets = [w.lower() for w in wallets if w]
        self.config = config or PolymarketConfig.from_env()
        self.fixed_order_usd = fixed_order_usd
        self.starting_bankroll = starting_bankroll
        self.position_size_pct = position_size_pct
        self.min_wallet_profit = min_wallet_profit
        self.min_wallet_win_rate = min_wallet_win_rate
        self.min_wallet_sharpe = min_wallet_sharpe
        self.use_confluence = use_confluence
        self.include_sell = include_sell
        self.contrarian = contrarian
        self.oracle = MarketOracle()
        self.loader = SubgraphLoader()
        self.profiler = BacktestWalletProfiler(self.oracle, include_sell=self.include_sell)
        self.confluence = SignalConfluence(self.config) if use_confluence else None
        self.trades: List[BacktestTrade] = []

    def _passes_filter(self, stats: WalletStats) -> bool:
        return (
            stats.trades >= 10
            and stats.pnl >= self.min_wallet_profit
            and stats.win_rate >= self.min_wallet_win_rate
            and stats.sharpe >= self.min_wallet_sharpe
        )

    def run(self, start_ts: int, end_ts: int, first: int = 1000) -> Dict[str, Any]:
        self.oracle.load_closed_markets()
        logger.info("Backtesting %d wallet(s) from %s to %s", len(self.wallets), start_ts, end_ts)

        # --- Phase 1: collect all candidate fills --------------------------------
        raw_fills = self.loader.fetch_fills(self.wallets, start_ts, end_ts, first=first)
        logger.info("Fetched %d raw OrderFilled events", len(raw_fills))

        normalized: List[Dict[str, Any]] = []
        for event in raw_fills:
            wallet = (event.get("maker") or "").lower()
            if wallet not in self.wallets:
                wallet = (event.get("taker") or "").lower()
            if wallet not in self.wallets:
                continue
            norm = _normalize_fill(event, wallet)
            if norm:
                normalized.append(norm)

        # --- Phase 2: profile wallets on closed trades --------------------------
        stats = self.profiler.profile(normalized)
        qualified = {w: s for w, s in stats.items() if self._passes_filter(s)}
        logger.info(
            "Wallet filter: %d/%d qualified (>$%s profit, >%s%% win, sharpe>%s)",
            len(qualified),
            len(stats),
            self.min_wallet_profit,
            self.min_wallet_win_rate,
            self.min_wallet_sharpe,
        )

        # --- Phase 3: walk forward and copy qualified BUY fills -----------------
        self.trades = []
        for fill in normalized:
            if fill["wallet"] not in qualified:
                continue
            trade_side = fill["wallet_side"]
            if trade_side != "BUY" and not self.include_sell:
                continue
            if self.contrarian:
                trade_side = "SELL" if trade_side == "BUY" else "BUY"
            token_id = fill["token_id"]
            exit_p = self.oracle.exit_price(token_id)
            if exit_p is None:
                continue
            entry_p = Decimal(str(fill["price"]))
            if entry_p <= 0:
                continue

            confluence_score = Decimal("0")
            confluence_confidence = Decimal("0")
            if self.confluence:
                assessment = self.confluence.assess(token_id, trade_side, entry_p)
                confluence_score = assessment.score
                confluence_confidence = assessment.confidence
                if self.use_confluence and not assessment.agree:
                    continue
                if self.use_confluence and confluence_confidence < self.config.confluence_min_confidence:
                    continue

            if self.position_size_pct is not None:
                notional = max(self.starting_bankroll * self.position_size_pct, Decimal("1"))
            else:
                notional = self.fixed_order_usd

            # Ensure we do not allocate more than the current bankroll allows.
            current_bankroll = self.starting_bankroll + sum((t.pnl for t in self.trades), Decimal("0"))
            if notional > current_bankroll:
                logger.info("Skipping trade for %s: required $%s, bankroll $%s", token_id[:16], notional, current_bankroll)
                continue

            shares = notional / entry_p
            if trade_side == "BUY":
                pnl = (exit_p - entry_p) * shares
                roi = ((exit_p / entry_p) - 1) * 100 if entry_p else Decimal("0")
            else:
                pnl = (entry_p - exit_p) * shares
                roi = ((entry_p / exit_p) - 1) * 100 if exit_p else Decimal("0")
            info = self.oracle.resolve(token_id) or {}

            self.trades.append(
                BacktestTrade(
                    wallet=fill["wallet"],
                    token_id=token_id,
                    outcome=info.get("outcome", ""),
                    slug=info.get("slug", ""),
                    side=fill["wallet_side"],
                    entry_price=entry_p.quantize(Decimal("0.0001")),
                    exit_price=exit_p,
                    shares=shares.quantize(Decimal("0.0001")),
                    notional_usd=notional.quantize(Decimal("0.01")),
                    pnl=pnl.quantize(Decimal("0.01")),
                    roi=roi.quantize(Decimal("0.01")),
                    timestamp=fill["timestamp"],
                    tx_hash=fill["transaction_hash"],
                    confluence_score=confluence_score,
                    confluence_confidence=confluence_confidence,
                )
            )

        return self.report()

    def report(self) -> Dict[str, Any]:
        if not self.trades:
            return {
                "wallets": self.wallets,
                "starting_bankroll": str(self.starting_bankroll),
                "total_trades": 0,
                "winners": 0,
                "losers": 0,
                "win_rate": "0.00",
                "total_pnl": "0.00",
                "final_bankroll": str(self.starting_bankroll),
                "roi_pct": "0.00",
                "max_drawdown": "0.00",
                "max_drawdown_pct": "0.00",
                "avg_trade": "0.00",
                "profit_factor": "0.00",
                "sharpe": "0.00",
                "trades": [],
                "note": "No closed-market copy trades in the selected window.",
            }

        pnls = [t.pnl for t in self.trades]
        wins = sum(1 for p in pnls if p > 0)
        losses = sum(1 for p in pnls if p < 0)
        total = len(pnls)
        win_rate = (Decimal(wins) / Decimal(total) * 100).quantize(Decimal("0.01"))
        total_pnl = sum(pnls, Decimal("0")).quantize(Decimal("0.01"))
        avg_trade = (total_pnl / Decimal(total)).quantize(Decimal("0.01")) if total else Decimal("0")

        gross_wins = sum((p for p in pnls if p > 0), Decimal("0"))
        gross_losses = abs(sum((p for p in pnls if p < 0), Decimal("0")))
        profit_factor = (
            (gross_wins / gross_losses).quantize(Decimal("0.01")) if gross_losses else Decimal("inf")
        )

        # Bankroll drawdown on the running balance, not just P&L series.
        peak = self.starting_bankroll
        trough = self.starting_bankroll
        dd = Decimal("0")
        balance = self.starting_bankroll
        for p in pnls:
            balance += p
            if balance > peak:
                peak = balance
            if balance < trough:
                trough = balance
            dd = max(dd, peak - balance)

        final_bankroll = self.starting_bankroll + total_pnl
        roi_pct = ((final_bankroll - self.starting_bankroll) / self.starting_bankroll * 100).quantize(Decimal("0.01"))
        max_dd_pct = (dd / peak * 100).quantize(Decimal("0.01")) if peak else Decimal("0")

        sharpe = Decimal("0")
        if len(pnls) > 1:
            try:
                mean = statistics.mean([float(p) for p in pnls])
                std = statistics.stdev([float(p) for p in pnls])
                if std:
                    sharpe = Decimal(str(mean / std)).quantize(Decimal("0.001"))
            except statistics.StatisticsError:
                pass

        return {
            "wallets": self.wallets,
            "starting_bankroll": str(self.starting_bankroll),
            "total_trades": total,
            "winners": wins,
            "losers": losses,
            "win_rate": str(win_rate),
            "total_pnl": str(total_pnl),
            "final_bankroll": str(final_bankroll),
            "roi_pct": str(roi_pct),
            "max_drawdown": str(dd.quantize(Decimal("0.01"))),
            "max_drawdown_pct": str(max_dd_pct),
            "avg_trade": str(avg_trade),
            "profit_factor": str(profit_factor),
            "sharpe": str(sharpe),
            "trades": [self._trade_to_dict(t) for t in self.trades],
        }

    @staticmethod
    def _trade_to_dict(t: BacktestTrade) -> Dict[str, Any]:
        return {
            "wallet": t.wallet,
            "token_id": t.token_id,
            "outcome": t.outcome,
            "slug": t.slug,
            "side": t.side,
            "entry_price": str(t.entry_price),
            "exit_price": str(t.exit_price),
            "shares": str(t.shares),
            "notional_usd": str(t.notional_usd),
            "pnl": str(t.pnl),
            "roi": str(t.roi),
            "timestamp": t.timestamp,
            "tx_hash": t.tx_hash,
            "confluence_score": str(t.confluence_score),
            "confluence_confidence": str(t.confluence_confidence),
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Polymarket copy-strategy backtest")
    parser.add_argument("--wallets", required=True, help="Comma-separated watched wallet addresses")
    parser.add_argument("--start", type=int, required=True, help="Unix start timestamp")
    parser.add_argument("--end", type=int, required=True, help="Unix end timestamp")
    parser.add_argument("--fixed-usd", type=float, default=50.0)
    parser.add_argument("--min-profit", type=float, default=10000.0)
    parser.add_argument("--min-win-rate", type=float, default=65.0)
    parser.add_argument("--min-sharpe", type=float, default=1.0)
    parser.add_argument("--confluence", action="store_true")
    parser.add_argument("--include-sell", action="store_true")
    parser.add_argument("--contrarian", action="store_true")
    parser.add_argument("--first", type=int, default=1000)
    parser.add_argument("--bankroll", type=float, default=1000.0)
    parser.add_argument("--position-size-pct", type=float, default=None)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    position_size_pct = Decimal(str(args.position_size_pct)) if args.position_size_pct is not None else None
    bt = WalkForwardBacktest(
        wallets=[w.strip() for w in args.wallets.split(",") if w.strip()],
        fixed_order_usd=Decimal(str(args.fixed_usd)),
        starting_bankroll=Decimal(str(args.bankroll)),
        position_size_pct=position_size_pct,
        min_wallet_profit=Decimal(str(args.min_profit)),
        min_wallet_win_rate=Decimal(str(args.min_win_rate)),
        min_wallet_sharpe=Decimal(str(args.min_sharpe)),
        use_confluence=args.confluence,
        include_sell=args.include_sell,
        contrarian=args.contrarian,
    )
    result = bt.run(args.start, args.end, first=args.first)
    print(result)


if __name__ == "__main__":
    main()
