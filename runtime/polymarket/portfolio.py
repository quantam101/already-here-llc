"""Portfolio-level risk guard and analytics for copy-trading.

Adapted from the 90% win-rate trading agent's circuit-breaker and analytics
modules (profitenginev5/trading-agent).  This version operates on closed copy
trades persisted in StateManager and applies hard daily/weekly loss, drawdown,
consecutive-loss, and win-rate rules before each new copy trade.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from .config import PolymarketConfig
from .state import StateManager


@dataclass(frozen=True)
class PortfolioAssessment:
    can_trade: bool
    reasons: List[str]
    position_scale: Decimal
    recommended_min_confidence: Optional[Decimal]
    daily_pnl: Decimal
    weekly_pnl: Decimal
    win_rate: Decimal
    consecutive_losses: int
    max_drawdown: Decimal


class PortfolioAnalytics:
    """Compute professional trading metrics over closed copy trades."""

    def __init__(self, state: StateManager) -> None:
        self._state = state

    def _trades_since(self, seconds: float) -> List[Dict[str, Any]]:
        return self._state.get_closed_trades(since=seconds)

    def pnls(self, window_seconds: Optional[float] = None) -> List[Decimal]:
        rows = self._state.get_closed_trades(since=window_seconds)
        return [Decimal(str(r.get("pnl", 0) or 0)) for r in rows]

    def total_pnl(self, window_seconds: Optional[float] = None) -> Decimal:
        return sum(self.pnls(window_seconds), Decimal("0"))

    def win_rate(self, window_seconds: Optional[float] = None) -> Decimal:
        pnls = self.pnls(window_seconds)
        if not pnls:
            return Decimal("0")
        wins = sum(1 for p in pnls if p > 0)
        return (Decimal(wins) / Decimal(len(pnls)) * 100).quantize(Decimal("0.01"))

    def consecutive_losses(self) -> int:
        streak = 0
        for row in self._state.get_closed_trades(order="DESC"):
            pnl = Decimal(str(row.get("pnl", 0) or 0))
            if pnl > 0:
                break
            if pnl < 0:
                streak += 1
        return streak

    def max_drawdown(self) -> Decimal:
        peak = Decimal("0")
        dd = Decimal("0")
        cumulative = Decimal("0")
        for pnl in self.pnls():
            cumulative += pnl
            if cumulative > peak:
                peak = cumulative
            drawdown = peak - cumulative
            if drawdown > dd:
                dd = drawdown
        return dd.quantize(Decimal("0.01"))

    def profit_factor(self) -> Decimal:
        pnls = self.pnls()
        wins = sum(p for p in pnls if p > 0)
        losses = abs(sum(p for p in pnls if p < 0))
        if losses == 0:
            return Decimal("0") if wins == 0 else Decimal("inf")
        return (wins / losses).quantize(Decimal("0.01"))

    def sharpe_ratio(self, window_seconds: Optional[float] = None) -> Decimal:
        pnls = self.pnls(window_seconds)
        if len(pnls) < 2:
            return Decimal("0")
        rois = [float(p) for p in pnls]
        mean = statistics.mean(rois)
        try:
            std = statistics.stdev(rois)
        except statistics.StatisticsError:
            return Decimal("0")
        if std == 0:
            return Decimal("0")
        return Decimal(str(mean / std)).quantize(Decimal("0.001"))

    def report(self) -> Dict[str, Any]:
        return {
            "daily_pnl": str(self.total_pnl(86400)),
            "weekly_pnl": str(self.total_pnl(7 * 86400)),
            "win_rate": str(self.win_rate()),
            "consecutive_losses": self.consecutive_losses(),
            "max_drawdown": str(self.max_drawdown()),
            "profit_factor": str(self.profit_factor()),
            "sharpe": str(self.sharpe_ratio()),
            "total_closed_trades": len(self.pnls()),
        }


class PortfolioRiskGuard:
    """Apply daily/weekly loss, drawdown, streak, and win-rate circuit breakers."""

    def __init__(self, config: PolymarketConfig, state: StateManager) -> None:
        self._config = config
        self._analytics = PortfolioAnalytics(state)

    def _scale_for_drawdown(self, drawdown: Decimal) -> Decimal:
        # drawdown is stored as a positive USD value.
        if self._config.portfolio_max_drawdown_pct <= 0:
            return Decimal("1")
        if drawdown <= 0:
            return Decimal("1")
        # Halt if max drawdown exceeded.
        if drawdown >= Decimal(str(self._config.portfolio_max_drawdown_pct)):
            return Decimal("0")
        # Scale down as drawdown approaches half the limit.
        threshold = Decimal(str(self._config.portfolio_max_drawdown_pct)) / 2
        if drawdown >= threshold:
            return Decimal("0.5")
        return Decimal("1")

    def assess(self) -> PortfolioAssessment:
        reasons: List[str] = []
        daily_pnl = self._analytics.total_pnl(86400)
        weekly_pnl = self._analytics.total_pnl(7 * 86400)
        win_rate = self._analytics.win_rate()
        consecutive = self._analytics.consecutive_losses()
        drawdown = self._analytics.max_drawdown()

        can_trade = True
        recommended: Optional[Decimal] = None

        if daily_pnl <= -self._config.portfolio_daily_loss_limit:
            can_trade = False
            reasons.append(
                f"daily loss {daily_pnl} <= -{self._config.portfolio_daily_loss_limit}"
            )

        if weekly_pnl <= -self._config.portfolio_weekly_loss_limit:
            can_trade = False
            reasons.append(
                f"weekly loss {weekly_pnl} <= -{self._config.portfolio_weekly_loss_limit}"
            )

        if consecutive >= self._config.portfolio_consecutive_loss_limit:
            can_trade = False
            reasons.append(
                f"{consecutive} consecutive losses >= {self._config.portfolio_consecutive_loss_limit}"
            )

        total_closed = len(self._analytics.pnls())
        if total_closed >= 10 and win_rate < self._config.portfolio_min_win_rate_pct:
            recommended = Decimal("95")
            reasons.append(
                f"win rate {win_rate}% < {self._config.portfolio_min_win_rate_pct}%; raising confidence to 95%"
            )

        scale = self._scale_for_drawdown(drawdown)
        if scale == 0:
            can_trade = False
            reasons.append(
                f"max drawdown ${drawdown} >= {self._config.portfolio_max_drawdown_pct}%"
            )
        elif scale < 1:
            reasons.append(f"drawdown {drawdown}; scaling positions to {scale}")

        return PortfolioAssessment(
            can_trade=can_trade,
            reasons=reasons,
            position_scale=scale,
            recommended_min_confidence=recommended,
            daily_pnl=daily_pnl,
            weekly_pnl=weekly_pnl,
            win_rate=win_rate,
            consecutive_losses=consecutive,
            max_drawdown=drawdown,
        )

    def status(self) -> Dict[str, Any]:
        return {
            **self._analytics.report(),
            "assessment": self.assess().__dict__,
        }
