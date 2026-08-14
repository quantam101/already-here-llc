"""Sovereign orchestrator coordinating listener, profiler, alerts, and risk."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import sys
import threading
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional

# Allow `python runtime/polymarket/orchestrator.py` while keeping package imports.
if __name__ == "__main__" and __package__ is None:
    _repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    sys.path.insert(0, _repo_root)
    __package__ = "runtime.polymarket"

from runtime.polymarket.abi import derive_price_from_fill, derive_usd_notional
from runtime.polymarket.alerts import TelegramAlertEngine
from runtime.polymarket.claude import ClaudeSummarizer
from runtime.polymarket.config import PolymarketConfig
from runtime.polymarket.listener import PolymarketListener
from runtime.polymarket.paper_trade import PaperTrader
from runtime.polymarket.portfolio import PortfolioRiskGuard
from runtime.polymarket.profiler import WalletProfiler
from runtime.polymarket.risk import RiskGuard
from runtime.polymarket.signals import SignalConfluence
from runtime.polymarket.state import StateManager
from runtime.polymarket.adaptive import AdaptiveLearner
from runtime.polymarket.utils import CircuitBreaker

logger = logging.getLogger("polymarket-tracker")


def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


class PolymarketOrchestrator:
    """
    Fully autonomous, multi-agent coordinator for the Polymarket tracker.

    Agent responsibilities:
      - Listener Agent : ingests on-chain fills via WebSocket + HTTP failovers
      - Profiler Agent : scores wallet performance (P&L, win-rate, Sharpe)
      - Risk Agent     : validates slippage, sizing, blacklists, and portfolio limits
      - Signal Agent   : 90% win-rate style confluence filter on public price history
      - Claude Agent   : optional AI signal summarizer (disabled unless API key + env toggle set)
      - Alert Agent    : dispatches Telegram alerts in <2s
      - Paper Trader   : fixed-size simulated copy positions with mark-to-market settlement
    """

    def __init__(self, config: Optional[PolymarketConfig] = None) -> None:
        self._config = config or PolymarketConfig.from_env()
        _setup_logging(self._config.log_level)
        self._state = StateManager(self._config.db_path)
        self._state.set_watched_wallets(self._config.watched_wallets)
        self._state.set_market_blacklist(self._config.blacklist_market_ids)

        self._listener = PolymarketListener(self._config, on_fill=self._on_fill)
        self._profiler = WalletProfiler(self._config, self._state)
        self._claude = ClaudeSummarizer(
            api_key=self._config.claude_api_key,
            enabled=self._config.claude_enabled,
            model=self._config.claude_model,
            max_tokens=self._config.claude_max_tokens,
            timeout=self._config.claude_timeout_seconds,
        )
        self._alerts = TelegramAlertEngine(self._config, self._state, summarizer=self._claude)
        self._risk = RiskGuard(self._config, self._state)
        self._portfolio = PortfolioRiskGuard(self._config, self._state)
        self._confluence = SignalConfluence(self._config, state=self._state)
        self._paper = PaperTrader(self._config, self._state) if self._config.paper_trading else None
        self._adaptive = AdaptiveLearner(self._config, self._state)

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
        return {
            "per_trade": self._risk.assess_alert(wallet, token_id, amount_usd).__dict__,
            "portfolio": self._portfolio.assess().__dict__,
            "confluence": self._confluence.assess(
                token_id, event.get("side", ""), Decimal(event.get("price", 0))
            ).__dict__,
        }

    # ------------------------------------------------------------------
    # Internal event pipeline
    # ------------------------------------------------------------------
    def _on_fill(self, fill: Dict[str, Any]) -> None:
        maker = (fill.get("maker") or "").lower()
        taker = (fill.get("taker") or "").lower()
        fill_side = fill.get("side") or "-"

        # Pick the active side per fill. Prefer the taker; if only the maker is watched,
        # copy the maker with the opposite side.
        focal_wallet = ""
        focal_role = ""
        focal_side = "-"
        for role, wallet, side in (
            ("taker", taker, fill_side),
            ("maker", maker, self._opposite_side(fill_side)),
        ):
            if not wallet:
                continue
            if self._config.watched_wallets and not self._state.is_watched(wallet):
                continue
            focal_wallet = wallet
            focal_role = role
            focal_side = side
            break

        if not focal_wallet:
            return

        # If no watchlist is configured, record fills passively but do not alert/copy.
        if not self._config.watched_wallets:
            self._record_fill(focal_wallet, focal_role, fill)
            return

        wallet = focal_wallet
        role = focal_role
        self._ensure_profile(wallet)
        score = self._profile_cache.get(wallet, {})
        passes = score.get("passes_filter", False)

        if not passes and self._config.watched_wallets:
            logger.debug("Wallet %s does not pass performance filter", wallet)
            return

        token_id = fill.get("token_id") or fill.get("maker_asset_id") or fill.get("taker_asset_id")
        price = derive_price_from_fill(fill)
        amount_usd = derive_usd_notional(fill)

        event = {
            "wallet": wallet,
            "role": role.upper(),
            "side": focal_side,
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
            return

        portfolio = self._portfolio.assess()
        bypass_for_paper = self._paper and self._config.paper_bypass_portfolio_guard
        if not portfolio.can_trade and not bypass_for_paper:
            logger.info("Portfolio risk gate blocked %s: %s", wallet, portfolio.reasons)
            return

        confluence = self._confluence.assess(event["token_id"], event["side"], price)
        if self._config.confluence_enabled and not confluence.agree:
            logger.info(
                "Confluence filter blocked %s on %s: score=%s side=%s",
                wallet,
                event["token_id"][:16],
                confluence.score,
                event["side"],
            )
            return
        if self._config.confluence_enabled and confluence.confidence < self._config.confluence_min_confidence:
            logger.info(
                "Confluence confidence too low for %s on %s: %s",
                wallet,
                event["token_id"][:16],
                confluence.confidence,
            )
            return

        event["portfolio_scale"] = str(portfolio.position_scale)
        event["confluence_score"] = str(confluence.score)
        event["confluence_confidence"] = str(confluence.confidence)

        self._record_trade(wallet, role, event)
        if self._paper:
            event["id"] = self._paper._position_id(event)
            event["wallet"] = wallet
            self._paper.open_position(event)
        # Only alert when the portfolio guard is not blocking (paper training can
        # bypass the guard, but alerts should still reflect viable live signals).
        if portfolio.can_trade:
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

    def _opposite_side(self, side: str) -> str:
        return {"BUY": "SELL", "SELL": "BUY"}.get(side.upper(), side)

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

    def _record_fill(self, wallet: str, role: str, fill: Dict[str, Any]) -> None:
        trade_id = hashlib.sha256(
            f"{fill.get('transaction_hash', '')}:{fill.get('log_index', 0)}:{wallet}:{role}".encode()
        ).hexdigest()
        self._state.record_trade(
            {
                "id": trade_id,
                "tx_hash": fill.get("transaction_hash", ""),
                "log_index": fill.get("log_index", 0),
                "block_number": fill.get("block_number", 0),
                "timestamp": time.time(),
                "wallet": wallet,
                "role": role.upper(),
                "market_id": "",
                "token_id": fill.get("token_id") or fill.get("maker_asset_id") or fill.get("taker_asset_id") or "",
                "side": fill.get("side") or "-",
                "amount_usd": derive_usd_notional(fill),
                "price": derive_price_from_fill(fill),
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
        if self._config.watched_wallets:
            threading.Thread(
                target=lambda: self.profiler_agent(), daemon=True, name="poly-profiler-warm"
            ).start()
        if self._paper:
            self._paper.start()
        if self._config.adaptive_learning_enabled:
            self._adaptive.start()
        self._listener.start()
        logger.info("Polymarket orchestrator started; watching %d wallets", len(self._config.watched_wallets))

    def stop(self) -> None:
        self._running = False
        if self._paper:
            self._paper.stop()
        self._adaptive.stop()
        self._listener.stop()

    def status(self) -> Dict[str, Any]:
        return {
            "running": self._running,
            "watched_wallets": self._state.get_watched_wallets(),
            "listener": self._listener.status(),
            "alerts": self._alerts.status(),
            "claude": self._claude.status(),
            "risk": self._risk.status(),
            "portfolio": self._portfolio.status(),
            "confluence": self._confluence.status(),
            "profiler": self._profiler.status(),
            "adaptive": self._adaptive.status(),
            "paper": self._paper.status() if self._paper else {"enabled": False},
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
