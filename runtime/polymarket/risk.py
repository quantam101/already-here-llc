"""Deterministic risk guardrails for copy-trading and alert gating."""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional

from .config import PolymarketConfig
from .state import StateManager
from .utils import safe_div

logger = logging.getLogger("polymarket-tracker")


@dataclass(frozen=True)
class RiskAssessment:
    pass_gate: bool
    reasons: List[str]
    max_slippage_pct: Decimal
    fixed_order_usd: Decimal
    blacklisted: bool


class RiskGuard:
    """Military-grade risk supervisor: slippage, sizing, blacklists, cooldowns."""

    def __init__(self, config: PolymarketConfig, state: StateManager) -> None:
        self._config = config
        self._state = state
        self._last_copy_alert: Dict[str, float] = {}

    def assess_alert(self, wallet: str, token_id: str, amount_usd: Decimal) -> RiskAssessment:
        reasons: List[str] = []
        if self._state.is_blacklisted(token_id):
            reasons.append(f"token {token_id} is blacklisted")
        if self._config.whitelist_only and not self._state.is_watched(wallet):
            reasons.append("wallet not on whitelist")
        if amount_usd < Decimal("0"):
            reasons.append("invalid negative amount")

        # Low-liquidity / wash-manipulation heuristic: reject tiny size alerts unless proven
        if amount_usd < Decimal("1.00") and not self._state.is_watched(wallet):
            reasons.append("below minimum alert size")

        return RiskAssessment(
            pass_gate=len(reasons) == 0,
            reasons=reasons,
            max_slippage_pct=self._config.max_slippage_pct,
            fixed_order_usd=self._config.fixed_order_usd,
            blacklisted=self._state.is_blacklisted(token_id),
        )

    def assess_copy_trade(
        self,
        wallet: str,
        token_id: str,
        target_entry_price: Decimal,
        current_price: Decimal,
    ) -> RiskAssessment:
        """
        Evaluate whether an automated copy trade is safe.
        Live execution is DISABLED by default; this gate returns structured evidence.
        """
        reasons: List[str] = []

        if self._state.is_blacklisted(token_id):
            reasons.append(f"market {token_id} is blacklisted")

        if self._config.whitelist_only and not self._state.is_watched(wallet):
            reasons.append("wallet not on whitelist")

        # Max slippage cap
        slippage = safe_div(
            (current_price - target_entry_price).copy_abs() * 100,
            target_entry_price,
            Decimal("0"),
        )
        if slippage > self._config.max_slippage_pct:
            reasons.append(
                f"slippage {slippage:.2f}% exceeds cap {self._config.max_slippage_pct:.2f}%"
            )

        # Fixed order sizing (percentage-of-wallet is forbidden)
        if self._config.fixed_order_usd <= 0:
            reasons.append("fixed order sizing not configured")

        # Cooldown between copy attempts
        now = time.monotonic()
        last = self._last_copy_alert.get(wallet, 0)
        if now - last < self._config.alert_cooldown_seconds:
            reasons.append("copy-trade cooldown active")

        # Explicit safety brake: auto-execution disabled unless env override is set.
        if os_env_live_disabled():
            reasons.append("POLYMARKET_LIVE_EXECUTION disabled by operator")

        return RiskAssessment(
            pass_gate=len(reasons) == 0,
            reasons=reasons,
            max_slippage_pct=self._config.max_slippage_pct,
            fixed_order_usd=self._config.fixed_order_usd,
            blacklisted=self._state.is_blacklisted(token_id),
        )

    def record_copy_attempt(self, wallet: str, token_id: str, approved: bool) -> None:
        self._last_copy_alert[wallet] = time.monotonic()
        logger.info("Copy-trade attempt for %s on %s approved=%s", wallet, token_id, approved)

    def status(self) -> Dict[str, Any]:
        return {
            "max_slippage_pct": str(self._config.max_slippage_pct),
            "fixed_order_usd": str(self._config.fixed_order_usd),
            "min_profit_usd": str(self._config.min_wallet_profit_usd),
            "min_win_rate_pct": str(self._config.min_win_rate_pct),
            "min_sharpe": str(self._config.min_sharpe_ratio),
            "whitelist_only": self._config.whitelist_only,
            "blacklist_count": len(self._config.blacklist_market_ids),
            "live_execution": not os_env_live_disabled(),
        }


def os_env_live_disabled() -> bool:
    """Live execution is opt-in only and requires explicit operator approval."""
    val = os.environ.get("POLYMARKET_LIVE_EXECUTION", "false").lower()
    return val not in ("true", "1", "yes")
