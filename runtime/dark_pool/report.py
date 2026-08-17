"""CLI report for FINRA dark-pool accumulation/distribution signals."""

from __future__ import annotations

import argparse
import json
import logging
from typing import Any, Dict, List

from .fetcher import FinraClient
from .scorer import DEFAULT_MIN_NOTIONAL, DEFAULT_MIN_PREV_SHARES, DEFAULT_MIN_SHARES, DarkPoolScorer
from .state import DarkPoolState


def _format_score(s: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "rank": s["rank"],
        "symbol": s["symbol"],
        "name": s.get("name", ""),
        "tier": s.get("tier", ""),
        "week": s["week_start"],
        "signal": s["signal"],
        "score": s["score"],
        "shares": s["shares"],
        "shares_change_pct": s.get("shares_change_pct"),
        "notional": s["notional"],
        "notional_change_pct": s.get("notional_change_pct"),
        "avg_trade_size": round(s["avg_trade_size"], 2),
        "avg_trade_size_change_pct": s.get("avg_trade_size_change_pct"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="FINRA dark-pool weekly signal report")
    parser.add_argument("--db", default="data/dark_pool.db", help="SQLite database path")
    parser.add_argument("--tier", default=None, help="Filter fetch by tier (e.g., T1, T2, OTCE)")
    parser.add_argument("--week", default=None, help="Specific week start date (YYYY-MM-DD)")
    parser.add_argument("--weeks-back", type=int, default=4, help="Number of recent weeks to fetch")
    parser.add_argument("--top", type=int, default=25, help="Number of top tickers to show")
    parser.add_argument("--signal", default=None, help="Filter by ACCUMULATION, DISTRIBUTION, NEUTRAL, STRONG_*")
    parser.add_argument("--fetch", action="store_true", help="Fetch latest FINRA data before scoring")
    parser.add_argument("--min-shares", type=int, default=DEFAULT_MIN_SHARES, help="Minimum current-week shares")
    parser.add_argument("--min-notional", type=int, default=DEFAULT_MIN_NOTIONAL, help="Minimum current-week notional")
    parser.add_argument("--min-prev-shares", type=int, default=DEFAULT_MIN_PREV_SHARES, help="Minimum prior-week shares")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    state = DarkPoolState(db_path=args.db)

    if args.fetch:
        client = FinraClient()
        tiers = [args.tier] if args.tier else None
        rows = client.fetch_recent_weeks(
            weeks_back=args.weeks_back,
            tiers=tiers,
        )
        if rows:
            state.upsert_weekly(rows)
            logging.info("Stored %d FINRA weekly rows", len(rows))
        else:
            logging.warning("No FINRA rows fetched")

    scorer = DarkPoolScorer(state)
    scores = scorer.refresh(
        week_start=args.week,
        min_shares=args.min_shares,
        min_notional=args.min_notional,
        min_prev_shares=args.min_prev_shares,
    )

    if args.signal:
        scores = [s for s in scores if s["signal"] == args.signal.upper().replace(" ", "_")]

    output = [_format_score(s) for s in scores[: args.top]]
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
