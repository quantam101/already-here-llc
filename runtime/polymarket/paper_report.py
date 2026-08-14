"""CLI report for live paper-trading performance."""

from __future__ import annotations

import json
import sqlite3
import sys
from decimal import Decimal
from typing import Any, Dict, List

from .config import PolymarketConfig


def _load_metrics(db_path: str, starting_bankroll: Decimal) -> Dict[str, Any]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    open_row = conn.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(amount), 0) as notional FROM paper_positions WHERE closed = 0"
    ).fetchone()
    closed_row = conn.execute(
        "SELECT COUNT(*) as c, COALESCE(SUM(pnl), 0) as pnl, COALESCE(SUM(roi), 0) as roi FROM paper_positions WHERE closed = 1"
    ).fetchone()

    trades = conn.execute(
        "SELECT pnl, roi FROM closed_trades WHERE strategy = 'paper' ORDER BY closed_at"
    ).fetchall()

    wins = sum(1 for t in trades if t["pnl"] and t["pnl"] > 0)
    losses = sum(1 for t in trades if t["pnl"] and t["pnl"] < 0)
    total = wins + losses
    win_rate = (wins / total * 100) if total else 0.0

    peak = Decimal("0")
    max_dd = Decimal("0")
    running = Decimal("0")
    for t in trades:
        running += Decimal(str(t["pnl"] or 0))
        if running > peak:
            peak = running
        dd = peak - running
        if dd > max_dd:
            max_dd = dd

    realized_pnl = Decimal(str(closed_row["pnl"] or 0))
    total_roi = (
        (realized_pnl / starting_bankroll * Decimal("100")).quantize(Decimal("0.01"))
        if starting_bankroll
        else Decimal("0")
    )
    bankroll = starting_bankroll + realized_pnl

    conn.close()
    return {
        "starting_bankroll": float(starting_bankroll),
        "bankroll": float(bankroll),
        "open_positions": open_row["c"],
        "open_notional": float(open_row["notional"]),
        "closed_trades": closed_row["c"],
        "realized_pnl": float(realized_pnl),
        "total_roi_pct": float(total_roi),
        "win_rate_pct": win_rate,
        "wins": wins,
        "losses": losses,
        "max_drawdown": float(max_dd),
        "trade_count": total,
    }


def main() -> None:
    config = PolymarketConfig.from_env()
    metrics = _load_metrics(config.db_path, config.paper_starting_bankroll)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
