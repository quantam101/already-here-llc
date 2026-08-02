"""Sovereign orchestrator coordinating listener, profiler, alerts, and risk."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional

from .abi import derive_price_from_fill, usdc_amount
from .alerts import TelegramAlertEngine
from .config import PolymarketConfig
from .listener import PolymarketListener
from .profiler import WalletProfiler
from .risk import RiskGuard
from .state import StateManager
from .utils import CircuitBreaker

logger = logging.getLogger("polymarket-tracker")


def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


def _usdc_to_decimal(raw: int) -> Decimal:
    return usdc_amount(raw)


class PolymarketOrchestrator:
    """
    Fully autonomous, multi-agent coordinator for the Polymarket tracker.

    Agent responsibilities:
      - Listener Agent : ingests on-chain fills via WebSocket + HTTP failovers
      - Profiler Agent : scores wallet performance (P&L, win-rate, Sharpe)
      - Risk Agent     : validates slippage, sizing, and blacklists
      - Alert Agent    : dispatches Telegram alerts in <2s
    """

    def __init__(self, config: Optional[PolymarketConfig] = None) -> None:
        self.config = config or PolymarketConfig.from_env()
        _setup_logging(self.config.log_level)
        self._state = StateManager(self.config.db_path)
        self._state.set_watched_wallets(self.config.watched_wallets)
        self._state.set_market_blacklist(self.config.blacklist_market_ids)

        self._listener = PolymarketListener(self.config, on_fill=self._on_fill)
        self._profiler = WalletProfiler(self.config, self._state)
        self._alerts = TelegramAlertEngine(self.config, self._state)
        self._risk = RiskGuard(self.config, self._state)

        self._profile_cb = CircuitBreaker("profiler", failure_threshold=3, reset_timeout_seconds=60.0)
        self._profile_cache: Dict[str, Any] = {}
        self._profile_lock = threading.Lock()
        self._running = False

    # ------------------------------------------------------------------
    # Agent entry points (declarative VHLL callable units)
    # ------------------------------------------------------------------
    def listener_agent(self) -> Dict[str, Any]:
        """Start the on-chain ingestion agent."""
        self._listener.start()
        return self._listener.status()

    def profiler_agent(self, wallet: Optional[str] = None) -> Dict[str, Any]:
        """Score one or all watched wallets."""
        targets = [wallet.lower()] if wallet else self._state.get_watched_wallets()
        results: Dict[str, Any] = {}
        for addr in targets:
            try:
                score = self._profiler.compute_score(addr)
                results[addr] = {
                    "profit_usd": str(score.profit_usd),
                    "win_rate": str(score.win_rate),
                    "sharpe": str(score.sharpe),
                    "total_trades": score.total_trades,
                    "conviction": score.conviction,
                    "passes_filter": self._profiler.passes_filter(score),
                }
                with self._profile_lock:
                    results[addr]["_ts"] = time.time()
                    self._profile_cache[addr] = results[addr]
            except Exception as exc:
                logger.exception("Profiler agent failed for %s", addr)
                self._profile_cb.record_failure()
                results[addr] = {"error": str(exc)}
        return results

    def alert_agent(self, event: Dict[str, Any]) -> List[Any]:
        """Dispatch Telegram alert for a qualifying event."""
        if not self._alerts.ready:
            return []
        score = self._profile_cache.get(event.get("wallet", ""), {})
        return self._alerts.send_alert(event, score)

    def risk_agent(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Return a structured risk assessment for an event."""
        wallet = event.get("wallet", "")
        token_id = event.get("token_id", "")
        amount_usd = Decimal(event.get("amount_usd", 0))
        return self._risk.assess_alert(wallet, token_id, amount_usd).__dict__

    # ------------------------------------------------------------------
    # Internal event pipeline
    # ------------------------------------------------------------------
    def _on_fill(self, fill: Dict[str, Any]) -> None:
        for role, wallet in (("maker", fill.get("maker")), ("taker", fill.get("taker"))):
            if not wallet:
                continue
            wallet = wallet.lower()
            if not self._state.is_watched(wallet) and not self._config.watched_wallets:
                # If no watchlist configured, record all and alert none.
                continue
            if self._config.watched_wallets and not self._state.is_watched(wallet):
                continue

            self._ensure_profile(wallet)
            score = self._profile_cache.get(wallet, {})
            passes = score.get("passes_filter", False)

            if not passes and self._config.watched_wallets:
                logger.debug("Wallet %s does not pass performance filter", wallet)
                continue

            token_id = fill.get("token_id") or fill.get("maker_asset_id") or fill.get("taker_asset_id")
            amount_raw = fill.get("maker_amount", 0) or fill.get("taker_amount", 0)
            price = derive_price_from_fill(fill)
            amount_usd = _usdc_to_decimal(amount_raw) * price

            event = {
                "wallet": wallet,
                "role": role.upper(),
                "side": fill.get("side") or "-",
                "token_id": token_id or "",
                "amount_usd": amount_usd,
                "price": price,
                "tx_hash": fill.get("transaction_hash", ""),
                "log_index": fill.get("log_index", 0),
                "block_number": fill.get("block_number", 0),
            }

            risk = self._risk.assess_alert(wallet, event["token_id"], amount_usd)
            if not risk.pass_gate:
                logger.info("Risk gate blocked %s: %s", wallet, risk.reasons)
                continue

            self._record_trade(wallet, role, event)
            self.alert_agent(event)

    def _ensure_profile(self, wallet: str) -> None:
        with self._profile_lock:
            if wallet in self._profile_cache:
                age = time.time() - self._profile_cache[wallet].get("_ts", 0)
                if age < 300:
                    return
        try:
            self.profiler_agent(wallet)
        except Exception:
            logger.exception("Profile refresh failed for %s", wallet)

    def _record_trade(self, wallet: str, role: str, event: Dict[str, Any]) -> None:
        trade_id = hashlib.sha256(
            f"{event['tx_hash']}:{event['log_index']}:{wallet}:{role}".encode()
        ).hexdigest()
        self._state.record_trade(
            {
                "id": trade_id,
                "tx_hash": event["tx_hash"],
                "log_index": event["log_index"],
                "block_number": event["block_number"],
                "timestamp": time.time(),
                "wallet": wallet,
                "role": role.upper(),
                "market_id": "",
                "token_id": event["token_id"],
                "side": event["side"],
                "amount_usd": event["amount_usd"],
                "price": event["price"],
            }
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    def start(self) -> None:
        """Start autonomous tracking."""
        if self._running:
            return
        self._running = True
        # Pre-warm profiles for watched wallets
        if self.config.watched_wallets:
            threading.Thread(
                target=lambda: self.profiler_agent(), daemon=True, name="poly-profiler-warm"
            ).start()
        self._listener.start()
        logger.info("Polymarket orchestrator started; watching %d wallets", len(self.config.watched_wallets))

    def stop(self) -> None:
        self._running = False
        self._listener.stop()

    def status(self) -> Dict[str, Any]:
        return {
            "running": self._running,
            "watched_wallets": self._state.get_watched_wallets(),
            "listener": self._listener.status(),
            "alerts": self._alerts.status(),
            "risk": self._risk.status(),
            "profiler": self._profiler.status(),
            "profile_cache": {
                k: v for k, v in self._profile_cache.items() if not k.startswith("_")
            },
        }


def main() -> None:
    """CLI entry point for the fully autonomous tracker."""
    config = PolymarketConfig.from_env()
    orchestrator = PolymarketOrchestrator(config)
    try:
        orchestrator.start()
        while True:
            time.sleep(5)
            logger.info(json.dumps(orchestrator.status(), default=str))
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        orchestrator.stop()


if __name__ == "__main__":
    main()
