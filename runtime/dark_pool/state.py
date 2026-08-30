"""SQLite persistence for FINRA dark pool weekly summaries and scores."""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from .fetcher import DarkPoolWeeklyRow

DEFAULT_DB_PATH = os.environ.get("DARK_POOL_DB_PATH", "data/dark_pool.db")


class DarkPoolState:
    """Store and query dark-pool weekly summary data."""

    def __init__(self, db_path: str = DEFAULT_DB_PATH) -> None:
        self._db_path = db_path
        self._ensure_dir()
        self._migrate()

    def _ensure_dir(self) -> None:
        dir_path = os.path.dirname(self._db_path)
        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)

    @contextmanager
    def _cursor(self):
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        try:
            cur = conn.cursor()
            yield cur
            conn.commit()
        finally:
            conn.close()

    def _migrate(self) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS weekly_summary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    name TEXT,
                    week_start TEXT NOT NULL,
                    summary_start_date TEXT NOT NULL,
                    last_reported_date TEXT,
                    shares INTEGER NOT NULL DEFAULT 0,
                    trades INTEGER NOT NULL DEFAULT 0,
                    notional INTEGER NOT NULL DEFAULT 0,
                    avg_trade_size REAL NOT NULL DEFAULT 0,
                    product_type TEXT,
                    tier TEXT,
                    summary_type TEXT,
                    market_participant TEXT,
                    mpid TEXT,
                    fetched_at REAL NOT NULL DEFAULT (strftime('%s','now')),
                    UNIQUE(symbol, week_start, summary_type, market_participant)
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    week_start TEXT NOT NULL,
                    score REAL NOT NULL DEFAULT 0,
                    rank INTEGER NOT NULL DEFAULT 0,
                    signal TEXT,
                    shares_change_pct REAL,
                    trades_change_pct REAL,
                    avg_trade_size_change_pct REAL,
                    notional_change_pct REAL,
                    fetched_at REAL NOT NULL DEFAULT (strftime('%s','now')),
                    UNIQUE(symbol, week_start)
                )
                """
            )

    def upsert_weekly(self, rows: List[DarkPoolWeeklyRow]) -> int:
        with self._cursor() as cur:
            for row in rows:
                cur.execute(
                    """
                    INSERT INTO weekly_summary
                    (symbol, name, week_start, summary_start_date, last_reported_date,
                     shares, trades, notional, avg_trade_size, product_type, tier,
                     summary_type, market_participant, mpid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(symbol, week_start, summary_type, market_participant)
                    DO UPDATE SET
                        name=excluded.name,
                        summary_start_date=excluded.summary_start_date,
                        last_reported_date=excluded.last_reported_date,
                        shares=excluded.shares,
                        trades=excluded.trades,
                        notional=excluded.notional,
                        avg_trade_size=excluded.avg_trade_size,
                        product_type=excluded.product_type,
                        tier=excluded.tier,
                        market_participant=excluded.market_participant,
                        mpid=excluded.mpid
                    """,
                    (
                        row.symbol, row.name, row.week_start, row.summary_start_date,
                        row.last_reported_date, row.shares, row.trades, row.notional,
                        row.avg_trade_size, row.product_type, row.tier, row.summary_type,
                        row.market_participant, row.mpid,
                    ),
                )
            return cur.rowcount

    def get_weekly(
        self,
        symbol: Optional[str] = None,
        week_start: Optional[str] = None,
        summary_type: str = "ATS_W_SMBL",
        limit: int = 10000,
    ) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            query = "SELECT * FROM weekly_summary WHERE summary_type = ?"
            params: List[Any] = [summary_type]
            if symbol:
                query += " AND symbol = ?"
                params.append(symbol.upper())
            if week_start:
                query += " AND week_start = ?"
                params.append(week_start)
            query += " ORDER BY week_start DESC, symbol LIMIT ?"
            params.append(limit)
            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]

    def get_latest_weeks(self, weeks: int = 4) -> List[str]:
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT week_start FROM weekly_summary
                ORDER BY week_start DESC LIMIT ?
                """,
                (weeks,),
            )
            return [r["week_start"] for r in cur.fetchall()]

    def upsert_scores(self, scores: List[Dict[str, Any]]) -> int:
        with self._cursor() as cur:
            for s in scores:
                cur.execute(
                    """
                    INSERT INTO scores
                    (symbol, week_start, score, rank, signal, shares_change_pct,
                     trades_change_pct, avg_trade_size_change_pct, notional_change_pct)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(symbol, week_start)
                    DO UPDATE SET
                        score=excluded.score,
                        rank=excluded.rank,
                        signal=excluded.signal,
                        shares_change_pct=excluded.shares_change_pct,
                        trades_change_pct=excluded.trades_change_pct,
                        avg_trade_size_change_pct=excluded.avg_trade_size_change_pct,
                        notional_change_pct=excluded.notional_change_pct,
                        fetched_at=strftime('%s','now')
                    """,
                    (
                        s["symbol"], s["week_start"], s["score"], s["rank"],
                        s.get("signal"), s.get("shares_change_pct"),
                        s.get("trades_change_pct"), s.get("avg_trade_size_change_pct"),
                        s.get("notional_change_pct"),
                    ),
                )
            return cur.rowcount

    def get_scores(
        self,
        week_start: Optional[str] = None,
        signal: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            query = "SELECT * FROM scores WHERE 1=1"
            params: List[Any] = []
            if week_start:
                query += " AND week_start = ?"
                params.append(week_start)
            if signal:
                query += " AND signal = ?"
                params.append(signal)
            query += " ORDER BY score DESC, symbol LIMIT ?"
            params.append(limit)
            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]

    def latest_score_week(self) -> Optional[str]:
        with self._cursor() as cur:
            cur.execute("SELECT week_start FROM scores ORDER BY week_start DESC LIMIT 1")
            row = cur.fetchone()
            return row["week_start"] if row else None
