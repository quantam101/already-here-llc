"""Score FINRA dark-pool weekly summaries for accumulation/distribution signals."""

from __future__ import annotations

import logging
import statistics
from typing import Any, Dict, List, Optional

from .state import DarkPoolState

logger = logging.getLogger("dark_pool")

DEFAULT_MIN_SHARES = 10_000
DEFAULT_MIN_NOTIONAL = 100_000
DEFAULT_MIN_PREV_SHARES = 1_000


class DarkPoolScorer:
    """Compute week-over-week dark-pool momentum and block-trade flags."""

    def __init__(self, state: DarkPoolState) -> None:
        self._state = state

    @staticmethod
    def _pct_change(current: float, previous: float) -> Optional[float]:
        if previous == 0:
            return None
        return (current - previous) / previous * 100.0

    @staticmethod
    def _z_score(value: float, values: List[float]) -> float:
        if not values:
            return 0.0
        try:
            mean = statistics.mean(values)
            stdev = statistics.stdev(values) if len(values) > 1 else 0.0
            if stdev == 0:
                return 0.0
            return (value - mean) / stdev
        except statistics.StatisticsError:
            return 0.0

    @staticmethod
    def _passes_minima(
        cur: Dict[str, Any],
        prev: Optional[Dict[str, Any]],
        min_shares: int,
        min_notional: int,
        min_prev_shares: int,
    ) -> bool:
        if cur["shares"] < min_shares or cur["notional"] < min_notional:
            return False
        if prev and prev["shares"] < min_prev_shares:
            return False
        return True

    def compute_weekly_scores(
        self,
        week_start: Optional[str] = None,
        min_shares: int = DEFAULT_MIN_SHARES,
        min_notional: int = DEFAULT_MIN_NOTIONAL,
        min_prev_shares: int = DEFAULT_MIN_PREV_SHARES,
    ) -> List[Dict[str, Any]]:
        """Score one week of ATS data versus the prior week for each symbol.

        Filters:
          * ``min_shares`` / ``min_notional`` remove illiquid / OTC noise.
          * ``min_prev_shares`` ensures a meaningful baseline for week-over-week
            percentage changes.

        Scoring:
          * 40% shares change z-score
          * 30% notional change z-score
          * 20% average trade size change z-score
          * 10% trade count change z-score
        """
        weeks = self._state.get_latest_weeks(weeks=4)
        if not weeks:
            return []
        current_week = week_start or weeks[0]
        if current_week not in weeks:
            current_week = weeks[0]
        prev_week_idx = weeks.index(current_week) + 1
        prev_week = weeks[prev_week_idx] if prev_week_idx < len(weeks) else None

        current_rows = {r["symbol"]: r for r in self._state.get_weekly(week_start=current_week)}
        prev_rows: Dict[str, Dict[str, Any]] = {}
        if prev_week:
            prev_rows = {r["symbol"]: r for r in self._state.get_weekly(week_start=prev_week)}

        if not current_rows:
            return []

        share_changes: List[float] = []
        trade_changes: List[float] = []
        size_changes: List[float] = []
        notional_changes: List[float] = []
        raw_scores: List[Dict[str, Any]] = []

        for symbol, cur in current_rows.items():
            prev = prev_rows.get(symbol)
            if not self._passes_minima(cur, prev, min_shares, min_notional, min_prev_shares):
                continue

            shares_chg = self._pct_change(cur["shares"], prev["shares"]) if prev else 0.0
            trades_chg = self._pct_change(cur["trades"], prev["trades"]) if prev else 0.0
            size_chg = self._pct_change(cur["avg_trade_size"], prev["avg_trade_size"]) if prev else 0.0
            notional_chg = self._pct_change(cur["notional"], prev["notional"]) if prev else 0.0

            if shares_chg is None:
                shares_chg = 0.0
            if size_chg is None:
                size_chg = 0.0
            if notional_chg is None:
                notional_chg = 0.0

            share_changes.append(shares_chg)
            trade_changes.append(trades_chg or 0.0)
            size_changes.append(size_chg)
            notional_changes.append(notional_chg)

            raw_scores.append({
                "symbol": symbol,
                "week_start": current_week,
                "name": cur["name"],
                "tier": cur.get("tier", ""),
                "shares": cur["shares"],
                "trades": cur["trades"],
                "avg_trade_size": cur["avg_trade_size"],
                "notional": cur["notional"],
                "shares_change_pct": round(shares_chg, 4),
                "trades_change_pct": round(trades_chg or 0.0, 4),
                "avg_trade_size_change_pct": round(size_chg, 4),
                "notional_change_pct": round(notional_chg, 4),
            })

        if not raw_scores:
            return []

        scored: List[Dict[str, Any]] = []
        for s in raw_scores:
            z_share = self._z_score(s["shares_change_pct"], share_changes)
            z_trade = self._z_score(s["trades_change_pct"], trade_changes)
            z_size = self._z_score(s["avg_trade_size_change_pct"], size_changes)
            z_notional = self._z_score(s["notional_change_pct"], notional_changes)

            composite = (z_share * 0.40) + (z_notional * 0.30) + (z_size * 0.20) + (z_trade * 0.10)

            if composite > 1.5:
                signal = "STRONG_ACCUMULATION"
            elif composite > 0.75:
                signal = "ACCUMULATION"
            elif composite < -1.5:
                signal = "STRONG_DISTRIBUTION"
            elif composite < -0.75:
                signal = "DISTRIBUTION"
            else:
                signal = "NEUTRAL"

            scored.append({
                **s,
                "score": round(composite, 4),
                "signal": signal,
                "z_share": round(z_share, 4),
                "z_notional": round(z_notional, 4),
                "z_size": round(z_size, 4),
                "z_trade": round(z_trade, 4),
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        for i, s in enumerate(scored, start=1):
            s["rank"] = i

        return scored

    def refresh(
        self,
        week_start: Optional[str] = None,
        min_shares: int = DEFAULT_MIN_SHARES,
        min_notional: int = DEFAULT_MIN_NOTIONAL,
        min_prev_shares: int = DEFAULT_MIN_PREV_SHARES,
    ) -> List[Dict[str, Any]]:
        """Compute and persist scores for the latest (or requested) week."""
        scores = self.compute_weekly_scores(
            week_start=week_start,
            min_shares=min_shares,
            min_notional=min_notional,
            min_prev_shares=min_prev_shares,
        )
        if scores:
            self._state.upsert_scores(scores)
        return scores
