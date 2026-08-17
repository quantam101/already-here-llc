"""FINRA dark-pool macro overlay for the Polymarket tracker.

Reads the weekly ATS transparency scores from ``runtime/dark_pool`` and
computes a risk-on / risk-off multiplier based on broad equity index / ETF
accumulation or distribution.  The output is consumed by the MetaAgent to
scale position size up when institutions are accumulating risk assets and down
when they are distributing.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

from ..dark_pool.fetcher import FinraClient
from ..dark_pool.scorer import DEFAULT_MIN_NOTIONAL, DEFAULT_MIN_PREV_SHARES, DEFAULT_MIN_SHARES, DarkPoolScorer
from ..dark_pool.state import DarkPoolState

logger = logging.getLogger("polymarket-tracker")

DEFAULT_MACRO_TICKERS = [
    "SPY",   # S&P 500
    "QQQ",   # Nasdaq-100
    "IWM",   # Russell 2000
    "TLT",   # Treasury bonds (flight-to-safety)
    "GLD",   # Gold
    "VIXY",  # VIX short-term futures
    "XLK",   # Technology
    "XLF",   # Financials
    "XLE",   # Energy
    "XLI",   # Industrials
]

DARK_POOL_DB_PATH = os.environ.get("DARK_POOL_DB_PATH", "data/dark_pool.db")


class DarkPoolMacroOverlay:
    """Macro overlay derived from delayed FINRA ATS transparency data."""

    def __init__(
        self,
        tickers: Optional[List[str]] = None,
        db_path: str = DARK_POOL_DB_PATH,
        min_shares: int = DEFAULT_MIN_SHARES,
        min_notional: int = DEFAULT_MIN_NOTIONAL,
        min_prev_shares: int = DEFAULT_MIN_PREV_SHARES,
    ) -> None:
        self._tickers = [t.upper() for t in (tickers or DEFAULT_MACRO_TICKERS)]
        self._state = DarkPoolState(db_path=db_path)
        self._scorer = DarkPoolScorer(self._state)
        self._min_shares = min_shares
        self._min_notional = min_notional
        self._min_prev_shares = min_prev_shares

    def _latest_scores_for_tickers(self) -> List[Dict[str, Any]]:
        """Return the latest score rows for configured macro tickers."""
        latest_week = self._state.latest_score_week()
        if not latest_week:
            return []
        scores = self._scorer.compute_weekly_scores(
            week_start=latest_week,
            min_shares=self._min_shares,
            min_notional=self._min_notional,
            min_prev_shares=self._min_prev_shares,
        )
        by_symbol = {s["symbol"]: s for s in scores}
        return [by_symbol[t] for t in self._tickers if t in by_symbol]

    def refresh(self, weeks_back: int = 2) -> "DarkPoolMacroOverlay":
        """Fetch recent FINRA data and recompute scores for macro tickers."""
        try:
            client = FinraClient()
            rows = client.fetch_recent_weeks(weeks_back=weeks_back)
            if rows:
                self._state.upsert_weekly(rows)
                logger.info("Dark-pool macro overlay refreshed: %d weekly rows", len(rows))
            self._scorer.refresh(
                min_shares=self._min_shares,
                min_notional=self._min_notional,
                min_prev_shares=self._min_prev_shares,
            )
        except Exception:
            logger.exception("Dark-pool macro overlay refresh failed")
        return self

    def signal(self) -> Dict[str, Any]:
        """Compute aggregate macro signal and exposure multiplier.

        Returns:
            ``bias`` one of risk_on, risk_off, neutral.
            ``exposure_multiplier`` between 0.5 and 1.5.
            ``score`` average composite z-score across macro tickers.
            ``details`` per-ticker breakdown.
        """
        rows = self._latest_scores_for_tickers()
        if not rows:
            return {
                "bias": "neutral",
                "exposure_multiplier": 1.0,
                "score": 0.0,
                "details": [],
                "reason": "no dark-pool macro data available",
            }

        accumulation = sum(1 for r in rows if r["signal"].startswith("STRONG_") or r["signal"] == "ACCUMULATION")
        distribution = sum(1 for r in rows if r["signal"].startswith("STRONG_D") or r["signal"] == "DISTRIBUTION")
        avg_score = sum(r["score"] for r in rows) / len(rows)

        # Count bonds / gold / volatility as defensive; accumulation there is risk-off.
        defensive = {"TLT", "GLD", "VIXY"}
        risk_on_score = 0.0
        risk_off_score = 0.0
        details: List[Dict[str, Any]] = []
        for r in rows:
            score = r["score"]
            is_defensive = r["symbol"] in defensive
            if is_defensive:
                # Defensive accumulation = risk-off; distribution = risk-on (rotation out of safety).
                net = -score
            else:
                net = score
            if net > 0:
                risk_on_score += net
            else:
                risk_off_score += abs(net)
            details.append({
                "symbol": r["symbol"],
                "name": r.get("name", ""),
                "signal": r["signal"],
                "score": round(score, 4),
                "net": round(net, 4),
            })

        net_macro = risk_on_score - risk_off_score

        if net_macro > 2.0:
            bias = "risk_on"
            multiplier = min(1.0 + (net_macro / 10.0), 1.5)
        elif net_macro < -2.0:
            bias = "risk_off"
            multiplier = max(1.0 + (net_macro / 10.0), 0.5)
        else:
            bias = "neutral"
            multiplier = 1.0

        return {
            "bias": bias,
            "exposure_multiplier": round(multiplier, 2),
            "score": round(avg_score, 4),
            "risk_on_score": round(risk_on_score, 4),
            "risk_off_score": round(risk_off_score, 4),
            "macro_tickers": len(rows),
            "accumulation_count": accumulation,
            "distribution_count": distribution,
            "details": details,
            "reason": f"{len(rows)} macro tickers; net macro score {net_macro:.2f}",
        }

    def report(self) -> str:
        return json.dumps(self.signal(), indent=2)


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    overlay = DarkPoolMacroOverlay()
    if "--refresh" in sys.argv:
        overlay.refresh()
    print(overlay.report())
