"""Live paper-trading harness for the Polymarket tracker.

Simulates fixed-$50 copy positions at alert time, marks them to market when each
prediction market resolves, and feeds realized PnL into the portfolio circuit
breaker. No real capital is moved.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional

import requests

from .config import PolymarketConfig
from .state import StateManager

logger = logging.getLogger("polymarket-tracker")

CLOB_MARKETS_BY_TOKEN = "https://clob.polymarket.com/markets-by-token/{token_id}"
CLOB_MARKET_BY_CONDITION = "https://clob.polymarket.com/markets/{condition_id}"
CLOB_CLOSED_MARKETS = "https://clob.polymarket.com/markets"


@dataclass(frozen=True)
class PaperPosition:
    id: str
    opened_at: float
    wallet: str
    token_id: str
    side: str
    shares: Decimal
    entry_price: Decimal
    amount: Decimal


class PaperMarketResolver:
    """Resolve token outcomes and settlement prices from the Polymarket CLOB."""

    def __init__(self) -> None:
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _cache_ttl(self, info: Dict[str, Any]) -> float:
        # Active markets: re-check every few minutes. Closed markets: forever.
        return 300.0 if info.get("active") else 1_000_000.0

    def _fetch(self, token_id: str) -> Optional[Dict[str, Any]]:
        try:
            by_token = requests.get(
                CLOB_MARKETS_BY_TOKEN.format(token_id=token_id), timeout=20
            ).json()
        except Exception as exc:
            logger.warning("Could not fetch token %s: %s", token_id[:16], exc)
            return None

        condition_id = by_token.get("condition_id")
        if not condition_id:
            return None

        try:
            market = requests.get(
                CLOB_MARKET_BY_CONDITION.format(condition_id=condition_id), timeout=20
            ).json()
        except Exception as exc:
            logger.warning("Could not fetch market %s: %s", condition_id[:16], exc)
            return None

        for token in market.get("tokens", []):
            tid = token.get("token_id", "").lower()
            if not tid:
                continue
            self._cache[tid] = {
                "condition_id": condition_id,
                "slug": market.get("market_slug", ""),
                "question": market.get("question", ""),
                "active": bool(market.get("active", False)) and not bool(market.get("closed", False)),
                "closed": bool(market.get("closed", False)),
                "outcome": token.get("outcome", ""),
                "winner": token.get("winner", False),
                "price": Decimal(str(token.get("price", 0) or 0)),
                "_ts": time.time(),
            }
        return self._cache.get(token_id.lower())

    def resolve(self, token_id: str) -> Optional[Dict[str, Any]]:
        token_id = token_id.lower()
        cached = self._cache.get(token_id)
        if cached and time.time() - cached.get("_ts", 0) < self._cache_ttl(cached):
            return cached
        return self._fetch(token_id)

    def exit_price(self, token_id: str) -> Optional[Decimal]:
        """Return 1 for a winning token, 0 for a closed losing token, or None if still open."""
        info = self.resolve(token_id)
        if not info:
            return None
        if info["active"]:
            return None
        if info.get("winner"):
            return Decimal("1")
        return Decimal("0")


class PaperTrader:
    """Fixed-size paper trading loop attached to the orchestrator."""

    def __init__(self, config: PolymarketConfig, state: StateManager) -> None:
        self._config = config
        self._state = state
        self._resolver = PaperMarketResolver()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._reconcile_loop, daemon=True, name="poly-paper-trader"
        )
        self._thread.start()
        logger.info("Paper trader started with $%s bankroll", self._config.paper_starting_bankroll)

    def stop(self) -> None:
        self._running = False
        if self._stop_event:
            self._stop_event.set()

    def _reconcile_loop(self) -> None:
        while self._running and not self._stop_event.is_set():
            try:
                self.reconcile()
            except Exception:
                logger.exception("Paper reconcile failed")
            self._stop_event.wait(self._config.paper_reconcile_interval_seconds)

    def open_position(self, event: Dict[str, Any]) -> Optional[PaperPosition]:
        """Record a new simulated copy position for an alerted fill."""
        try:
            entry_price = Decimal(str(event.get("price", 0) or 0))
        except Exception:
            entry_price = Decimal("0")
        if entry_price <= 0:
            logger.warning("Paper trade skipped: no entry price for %s", event.get("token_id", ""))
            return None

        amount = Decimal(str(self._config.fixed_order_usd))
        shares = (amount / entry_price).quantize(Decimal("0.0001"))
        position_id = event.get("id") or self._position_id(event)

        pos = PaperPosition(
            id=position_id,
            opened_at=time.time(),
            wallet=event.get("wallet", "").lower(),
            token_id=event.get("token_id", "").lower(),
            side=event.get("side", "BUY"),
            shares=shares,
            entry_price=entry_price,
            amount=amount,
        )

        self._state.record_paper_position(
            {
                "id": pos.id,
                "opened_at": pos.opened_at,
                "wallet": pos.wallet,
                "token_id": pos.token_id,
                "side": pos.side,
                "shares": float(pos.shares),
                "entry_price": float(pos.entry_price),
                "amount": float(pos.amount),
            }
        )
        logger.info(
            "Paper position opened: %s %s %s shares @ %s for $%s",
            pos.token_id[:16],
            pos.side,
            pos.shares,
            pos.entry_price,
            pos.amount,
        )
        return pos

    def reconcile(self) -> List[Dict[str, Any]]:
        """Mark any open paper positions to market and close realized trades."""
        closed: List[Dict[str, Any]] = []
        for pos in self._state.get_open_paper_positions():
            try:
                exit_price = self._resolver.exit_price(pos["token_id"])
            except Exception:
                logger.exception("Resolver failed for %s", pos["token_id"][:16])
                continue

            if exit_price is None:
                continue

            pnl, roi = self._compute_pnl(pos, exit_price)
            self._state.close_paper_position(
                pos["id"], float(exit_price), float(pnl), float(roi)
            )
            info = self._resolver.resolve(pos["token_id"]) or {}
            logger.info(
                "Paper position closed: %s side=%s entry=%s exit=%s pnl=%s",
                pos["token_id"][:16],
                pos["side"],
                pos["entry_price"],
                exit_price,
                pnl,
            )
            closed.append(
                {
                    "id": pos["id"],
                    "wallet": pos["wallet"],
                    "token_id": pos["token_id"],
                    "side": pos["side"],
                    "entry_price": pos["entry_price"],
                    "exit_price": float(exit_price),
                    "pnl": float(pnl),
                    "roi": float(roi),
                    "question": info.get("question", ""),
                }
            )
        return closed

    def _compute_pnl(self, pos: Dict[str, Any], exit_price: Decimal) -> tuple[Decimal, Decimal]:
        entry_price = Decimal(str(pos["entry_price"]))
        amount = Decimal(str(pos["amount"]))
        side = str(pos.get("side", "BUY")).upper()
        # Long: (exit - entry) / entry * notional
        # Short: (entry - exit) / entry * notional
        mult = Decimal("-1") if side == "SELL" else Decimal("1")
        raw_pnl = (exit_price - entry_price) / entry_price * amount
        pnl = (mult * raw_pnl).quantize(Decimal("0.01"))
        roi = (pnl / amount * 100).quantize(Decimal("0.01")) if amount else Decimal("0")
        return pnl, roi

    def _position_id(self, event: Dict[str, Any]) -> str:
        return f"{event.get('tx_hash', '')}:{event.get('log_index', 0)}:{event.get('wallet', '')}:{event.get('token_id', '')}"

    def status(self) -> Dict[str, Any]:
        summary = self._state.paper_position_summary()
        return {
            "enabled": True,
            "starting_bankroll": str(self._config.paper_starting_bankroll),
            "open_count": summary["open_count"],
            "open_notional": summary["open_notional"],
            "closed_count": summary["closed_count"],
            "realized_pnl": summary["realized_pnl"],
            "realized_roi": summary["realized_roi"],
        }
