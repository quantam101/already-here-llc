"""SQLite state manager for the Polymarket tracker."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class WalletScore:
    address: str
    profit_usd: Decimal
    win_rate: Decimal
    sharpe: Decimal
    total_trades: int
    wins: int
    losses: int
    conviction: str
    last_updated: float


class StateManager:
    """Thread-safe SQLite persistence for trades, wallets, markets, and alerts."""

    def __init__(self, db_path: str) -> None:
        self._path = db_path
        Path(os.path.dirname(db_path) or ".").mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        return conn

    @contextmanager
    def _cursor(self):
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = self._connect()
            self._local.conn = conn
        try:
            yield conn.cursor()
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    def _init_schema(self) -> None:
        with self._cursor() as cur:
            cur.executescript(
                """
                CREATE TABLE IF NOT EXISTS wallets (
                    address TEXT PRIMARY KEY,
                    watched INTEGER DEFAULT 0,
                    score_json TEXT,
                    last_trade_at REAL
                );
                CREATE TABLE IF NOT EXISTS trades (
                    id TEXT PRIMARY KEY,
                    tx_hash TEXT,
                    log_index INTEGER,
                    block_number INTEGER,
                    timestamp REAL,
                    wallet TEXT,
                    role TEXT,
                    market_id TEXT,
                    token_id TEXT,
                    side TEXT,
                    amount_usd REAL,
                    price REAL,
                    raw_json TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet);
                CREATE INDEX IF NOT EXISTS idx_trades_tx ON trades(tx_hash);
                CREATE INDEX IF NOT EXISTS idx_trades_ts ON trades(timestamp);
                CREATE TABLE IF NOT EXISTS markets (
                    token_id TEXT PRIMARY KEY,
                    condition_id TEXT,
                    name TEXT,
                    slug TEXT,
                    outcome TEXT,
                    liquidity REAL,
                    blacklisted INTEGER DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    wallet TEXT,
                    tx_hash TEXT,
                    sent_at REAL,
                    message TEXT,
                    status TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_alerts_wallet ON alerts(wallet);
                CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(sent_at);
                CREATE TABLE IF NOT EXISTS closed_trades (
                    id TEXT PRIMARY KEY,
                    opened_at REAL,
                    closed_at REAL,
                    wallet TEXT,
                    token_id TEXT,
                    side TEXT,
                    shares REAL,
                    entry_price REAL,
                    exit_price REAL,
                    pnl REAL,
                    roi REAL,
                    strategy TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_closed_trades_wallet ON closed_trades(wallet);
                CREATE INDEX IF NOT EXISTS idx_closed_trades_ts ON closed_trades(closed_at);
                CREATE INDEX IF NOT EXISTS idx_closed_trades_token ON closed_trades(token_id);

                CREATE TABLE IF NOT EXISTS paper_positions (
                    id TEXT PRIMARY KEY,
                    opened_at REAL,
                    wallet TEXT,
                    token_id TEXT,
                    side TEXT,
                    shares REAL,
                    entry_price REAL,
                    amount REAL,
                    closed INTEGER DEFAULT 0,
                    closed_at REAL,
                    exit_price REAL,
                    pnl REAL,
                    roi REAL
                );
                CREATE INDEX IF NOT EXISTS idx_paper_positions_open ON paper_positions(closed);
                CREATE INDEX IF NOT EXISTS idx_paper_positions_token ON paper_positions(token_id);
                CREATE INDEX IF NOT EXISTS idx_paper_positions_wallet ON paper_positions(wallet);

                CREATE TABLE IF NOT EXISTS adaptive_wallet_scores (
                    wallet TEXT PRIMARY KEY,
                    score REAL,
                    passes INTEGER DEFAULT 0,
                    win_rate REAL,
                    profit_factor REAL,
                    total_pnl REAL,
                    trade_count INTEGER,
                    updated_at REAL
                );
                CREATE INDEX IF NOT EXISTS idx_adaptive_wallet_scores_score ON adaptive_wallet_scores(score);

                CREATE TABLE IF NOT EXISTS adaptive_confluence_thresholds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    threshold REAL,
                    min_confidence REAL,
                    target_win_rate REAL,
                    win_rate REAL,
                    total_pnl REAL,
                    trade_count INTEGER,
                    updated_at REAL
                );
                CREATE INDEX IF NOT EXISTS idx_adaptive_confluence_thresholds_updated ON adaptive_confluence_thresholds(updated_at);

                CREATE TABLE IF NOT EXISTS agent_status (
                    agent TEXT PRIMARY KEY,
                    status_json TEXT,
                    updated_at REAL
                );
                CREATE INDEX IF NOT EXISTS idx_agent_status_updated ON agent_status(updated_at);

                CREATE TABLE IF NOT EXISTS meta_decisions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    decision_json TEXT,
                    created_at REAL
                );
                CREATE INDEX IF NOT EXISTS idx_meta_decisions_created ON meta_decisions(created_at);

                CREATE TABLE IF NOT EXISTS security_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    record_type TEXT,
                    record_id TEXT,
                    record_hash TEXT,
                    previous_hash TEXT,
                    anomaly_flags TEXT,
                    created_at REAL
                );
                CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit(created_at);
                CREATE INDEX IF NOT EXISTS idx_security_audit_type ON security_audit(record_type);
                """
            )
        self._migrate_columns()

    def _migrate_columns(self) -> None:
        """Add columns introduced after the initial schema without failing if they already exist."""
        columns = [
            ("closed_trades", "confluence_score"),
            ("closed_trades", "confluence_confidence"),
            ("closed_trades", "portfolio_scale"),
            ("paper_positions", "confluence_score"),
            ("paper_positions", "confluence_confidence"),
            ("paper_positions", "portfolio_scale"),
        ]
        with self._cursor() as cur:
            for table, column in columns:
                try:
                    cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} REAL")
                except sqlite3.OperationalError:
                    pass

    def set_watched_wallets(self, addresses: List[str]) -> None:
        with self._cursor() as cur:
            cur.execute("UPDATE wallets SET watched = 0")
            cur.executemany(
                "INSERT INTO wallets(address, watched) VALUES(?, 1) ON CONFLICT(address) DO UPDATE SET watched=1",
                [(a.lower(),) for a in addresses],
            )

    def get_watched_wallets(self) -> List[str]:
        with self._cursor() as cur:
            rows = cur.execute("SELECT address FROM wallets WHERE watched = 1").fetchall()
            return [r["address"] for r in rows]

    def is_watched(self, address: str) -> bool:
        with self._cursor() as cur:
            row = cur.execute(
                "SELECT 1 FROM wallets WHERE address = ? AND watched = 1", (address.lower(),)
            ).fetchone()
            return bool(row)

    def upsert_wallet_score(self, score: WalletScore) -> None:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO wallets(address, score_json, last_trade_at)
                   VALUES(?, ?, ?)
                   ON CONFLICT(address) DO UPDATE SET
                   score_json=excluded.score_json, last_trade_at=excluded.last_trade_at""",
                (
                    score.address.lower(),
                    json.dumps(
                        {
                            "profit_usd": str(score.profit_usd),
                            "win_rate": str(score.win_rate),
                            "sharpe": str(score.sharpe),
                            "total_trades": score.total_trades,
                            "wins": score.wins,
                            "losses": score.losses,
                            "conviction": score.conviction,
                            "last_updated": score.last_updated,
                        }
                    ),
                    score.last_updated,
                ),
            )

    def get_wallet_score(self, address: str) -> Optional[WalletScore]:
        with self._cursor() as cur:
            row = cur.execute(
                "SELECT score_json FROM wallets WHERE address = ?", (address.lower(),)
            ).fetchone()
            if not row or not row["score_json"]:
                return None
            data = json.loads(row["score_json"])
            return WalletScore(
                address=address.lower(),
                profit_usd=Decimal(data["profit_usd"]),
                win_rate=Decimal(data["win_rate"]),
                sharpe=Decimal(data["sharpe"]),
                total_trades=int(data["total_trades"]),
                wins=int(data["wins"]),
                losses=int(data["losses"]),
                conviction=str(data["conviction"]),
                last_updated=float(data["last_updated"]),
            )

    def record_trade(self, trade: Dict[str, Any]) -> None:
        with self._cursor() as cur:
            cur.execute(
                """INSERT OR IGNORE INTO trades
                   (id, tx_hash, log_index, block_number, timestamp, wallet, role,
                    market_id, token_id, side, amount_usd, price, raw_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    trade["id"],
                    trade["tx_hash"],
                    trade.get("log_index", 0),
                    trade.get("block_number", 0),
                    trade.get("timestamp", time.time()),
                    trade["wallet"].lower(),
                    trade.get("role", ""),
                    trade.get("market_id", ""),
                    trade.get("token_id", ""),
                    trade.get("side", ""),
                    float(trade.get("amount_usd", 0)),
                    float(trade.get("price", 0)),
                    json.dumps(trade, sort_keys=True, default=str),
                ),
            )

    def get_wallet_trades(self, address: str, since: Optional[float] = None) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM trades WHERE wallet = ?"
        params: List[Any] = [address.lower()]
        if since is not None:
            sql += " AND timestamp >= ?"
            params.append(since)
        sql += " ORDER BY timestamp DESC"
        with self._cursor() as cur:
            rows = cur.execute(sql, params).fetchall()
            return [dict(r) for r in rows]

    def record_alert(self, alert_id: str, wallet: str, tx_hash: str, message: str, status: str) -> None:
        with self._cursor() as cur:
            cur.execute(
                "INSERT OR IGNORE INTO alerts (id, wallet, tx_hash, sent_at, message, status) VALUES (?, ?, ?, ?, ?, ?)",
                (alert_id, wallet.lower(), tx_hash, time.time(), message, status),
            )

    def alert_count_today(self, wallet: str) -> int:
        start = time.time() - 86400
        with self._cursor() as cur:
            row = cur.execute(
                "SELECT COUNT(*) as c FROM alerts WHERE wallet = ? AND sent_at >= ?",
                (wallet.lower(), start),
            ).fetchone()
            return int(row["c"]) if row else 0

    def set_market_blacklist(self, token_ids: List[str]) -> None:
        with self._cursor() as cur:
            cur.executemany(
                "INSERT INTO markets(token_id, blacklisted) VALUES(?, 1) ON CONFLICT(token_id) DO UPDATE SET blacklisted=1",
                [(t.lower(),) for t in token_ids],
            )

    def is_blacklisted(self, token_id: str) -> bool:
        with self._cursor() as cur:
            row = cur.execute(
                "SELECT blacklisted FROM markets WHERE token_id = ?", (token_id.lower(),)
            ).fetchone()
            return bool(row and row["blacklisted"])

    def upsert_market(self, token_id: str, metadata: Dict[str, Any]) -> None:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO markets(token_id, condition_id, name, slug, outcome, liquidity)
                   VALUES(?, ?, ?, ?, ?, ?)
                   ON CONFLICT(token_id) DO UPDATE SET
                   condition_id=excluded.condition_id, name=excluded.name,
                   slug=excluded.slug, outcome=excluded.outcome, liquidity=excluded.liquidity""",
                (
                    token_id.lower(),
                    metadata.get("condition_id", ""),
                    metadata.get("name", ""),
                    metadata.get("slug", ""),
                    metadata.get("outcome", ""),
                    metadata.get("liquidity", 0.0),
                ),
            )

    def get_market(self, token_id: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            row = cur.execute("SELECT * FROM markets WHERE token_id = ?", (token_id.lower(),)).fetchone()
            return dict(row) if row else None

    def record_closed_trade(self, trade: Dict[str, Any]) -> None:
        with self._cursor() as cur:
            cur.execute(
                """INSERT OR IGNORE INTO closed_trades
                   (id, opened_at, closed_at, wallet, token_id, side, shares,
                    entry_price, exit_price, pnl, roi, strategy,
                    confluence_score, confluence_confidence, portfolio_scale)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    trade["id"],
                    trade.get("opened_at", trade.get("closed_at", time.time())),
                    trade.get("closed_at", time.time()),
                    trade.get("wallet", "").lower(),
                    trade.get("token_id", "").lower(),
                    trade.get("side", ""),
                    float(trade.get("shares", 0)),
                    float(trade.get("entry_price", 0)),
                    float(trade.get("exit_price", 0)),
                    float(trade.get("pnl", 0)),
                    float(trade.get("roi", 0)),
                    trade.get("strategy", "copy"),
                    float(trade.get("confluence_score", 0) or 0),
                    float(trade.get("confluence_confidence", 0) or 0),
                    float(trade.get("portfolio_scale", 0) or 0),
                ),
            )

    def get_closed_trades(
        self, since: Optional[float] = None, order: str = "DESC"
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM closed_trades"
        params: List[Any] = []
        if since is not None:
            sql += " WHERE closed_at >= ?"
            params.append(since)
        sql += f" ORDER BY closed_at {order}"
        with self._cursor() as cur:
            rows = cur.execute(sql, params).fetchall()
            return [dict(r) for r in rows]

    def record_paper_position(self, position: Dict[str, Any]) -> None:
        with self._cursor() as cur:
            cur.execute(
                """INSERT OR IGNORE INTO paper_positions
                   (id, opened_at, wallet, token_id, side, shares, entry_price, amount,
                    confluence_score, confluence_confidence, portfolio_scale)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    position["id"],
                    position.get("opened_at", time.time()),
                    position.get("wallet", "").lower(),
                    position.get("token_id", "").lower(),
                    position.get("side", ""),
                    float(position.get("shares", 0)),
                    float(position.get("entry_price", 0)),
                    float(position.get("amount", 0)),
                    float(position.get("confluence_score", 0) or 0),
                    float(position.get("confluence_confidence", 0) or 0),
                    float(position.get("portfolio_scale", 0) or 0),
                ),
            )

    def get_open_paper_positions(self) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            rows = cur.execute("SELECT * FROM paper_positions WHERE closed = 0 ORDER BY opened_at").fetchall()
            return [dict(r) for r in rows]

    def get_closed_paper_trades(
        self, since: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM paper_positions WHERE closed = 1"
        params: List[Any] = []
        if since is not None:
            sql += " AND closed_at >= ?"
            params.append(since)
        sql += " ORDER BY closed_at"
        with self._cursor() as cur:
            rows = cur.execute(sql, params).fetchall()
            return [dict(r) for r in rows]

    def close_paper_position(self, position_id: str, exit_price: float, pnl: float, roi: float) -> None:
        with self._cursor() as cur:
            cur.execute(
                """UPDATE paper_positions
                   SET closed = 1, closed_at = ?, exit_price = ?, pnl = ?, roi = ?
                   WHERE id = ?""",
                (time.time(), float(exit_price), float(pnl), float(roi), position_id),
            )
            row = cur.execute(
                "SELECT * FROM paper_positions WHERE id = ?", (position_id,)
            ).fetchone()
            if not row:
                return
            pos = dict(row)
            self.record_closed_trade(
                {
                    "id": pos["id"],
                    "opened_at": pos["opened_at"],
                    "closed_at": time.time(),
                    "wallet": pos["wallet"],
                    "token_id": pos["token_id"],
                    "side": pos["side"],
                    "shares": pos["shares"],
                    "entry_price": pos["entry_price"],
                    "exit_price": exit_price,
                    "pnl": pnl,
                    "roi": roi,
                    "strategy": "paper",
                    "confluence_score": pos.get("confluence_score"),
                    "confluence_confidence": pos.get("confluence_confidence"),
                    "portfolio_scale": pos.get("portfolio_scale"),
                }
            )

    def paper_position_summary(self) -> Dict[str, Any]:
        with self._cursor() as cur:
            open_rows = cur.execute(
                "SELECT COUNT(*) as c, COALESCE(SUM(amount), 0) as notional FROM paper_positions WHERE closed = 0"
            ).fetchone()
            closed_rows = cur.execute(
                "SELECT COUNT(*) as c, COALESCE(SUM(pnl), 0) as pnl, COALESCE(SUM(roi), 0) as roi FROM paper_positions WHERE closed = 1"
            ).fetchone()
            return {
                "open_count": int(open_rows["c"]),
                "open_notional": float(open_rows["notional"]),
                "closed_count": int(closed_rows["c"]),
                "realized_pnl": float(closed_rows["pnl"]),
                "realized_roi": float(closed_rows["roi"]),
            }

    def set_adaptive_wallet_score(self, score: Dict[str, Any]) -> None:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO adaptive_wallet_scores
                   (wallet, score, passes, win_rate, profit_factor, total_pnl, trade_count, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(wallet) DO UPDATE SET
                   score=excluded.score, passes=excluded.passes, win_rate=excluded.win_rate,
                   profit_factor=excluded.profit_factor, total_pnl=excluded.total_pnl,
                   trade_count=excluded.trade_count, updated_at=excluded.updated_at""",
                (
                    score["wallet"].lower(),
                    float(score.get("score", 0) or 0),
                    int(bool(score.get("passes", False))),
                    float(score.get("win_rate", 0) or 0),
                    float(score.get("profit_factor", 0) or 0),
                    float(score.get("total_pnl", 0) or 0),
                    int(score.get("trade_count", 0) or 0),
                    float(score.get("updated_at", time.time())),
                ),
            )

    def get_adaptive_wallet_score(self, wallet: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            row = cur.execute(
                "SELECT * FROM adaptive_wallet_scores WHERE wallet = ?", (wallet.lower(),)
            ).fetchone()
            return dict(row) if row else None

    def get_all_adaptive_wallet_scores(self) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            rows = cur.execute("SELECT * FROM adaptive_wallet_scores ORDER BY score DESC").fetchall()
            return [dict(r) for r in rows]

    def set_adaptive_confluence_threshold(self, threshold: Dict[str, Any]) -> None:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO adaptive_confluence_thresholds
                   (threshold, min_confidence, target_win_rate, win_rate, total_pnl, trade_count, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    float(threshold.get("threshold", 0) or 0),
                    float(threshold.get("min_confidence", 0) or 0),
                    float(threshold.get("target_win_rate", 0) or 0),
                    float(threshold.get("win_rate", 0) or 0),
                    float(threshold.get("total_pnl", 0) or 0),
                    int(threshold.get("trade_count", 0) or 0),
                    float(threshold.get("updated_at", time.time())),
                ),
            )
            cur.execute("DELETE FROM adaptive_confluence_thresholds WHERE id < ?", (cur.lastrowid - 100,))

    def get_adaptive_confluence_threshold(self) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            row = cur.execute(
                "SELECT * FROM adaptive_confluence_thresholds ORDER BY updated_at DESC LIMIT 1"
            ).fetchone()
            return dict(row) if row else None

    def set_agent_status(self, agent: str, status: Dict[str, Any]) -> None:
        with self._cursor() as cur:
            cur.execute(
                "INSERT INTO agent_status (agent, status_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(agent) DO UPDATE SET status_json=excluded.status_json, updated_at=excluded.updated_at",
                (agent, json.dumps(status, sort_keys=True, default=str), time.time()),
            )

    def get_agent_status(self, agent: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            row = cur.execute("SELECT status_json FROM agent_status WHERE agent = ?", (agent,)).fetchone()
            if row and row["status_json"]:
                return json.loads(row["status_json"])
            return None

    def get_all_agent_statuses(self) -> Dict[str, Dict[str, Any]]:
        with self._cursor() as cur:
            rows = cur.execute("SELECT agent, status_json FROM agent_status").fetchall()
            return {r["agent"]: json.loads(r["status_json"]) for r in rows if r["status_json"]}

    def record_meta_decision(self, decision: Dict[str, Any]) -> None:
        with self._cursor() as cur:
            cur.execute(
                "INSERT INTO meta_decisions (decision_json, created_at) VALUES (?, ?)",
                (json.dumps(decision, sort_keys=True, default=str), time.time()),
            )
            cur.execute("DELETE FROM meta_decisions WHERE id < ?", (cur.lastrowid - 1000,))

    def get_latest_meta_decision(self) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            row = cur.execute("SELECT decision_json FROM meta_decisions ORDER BY created_at DESC LIMIT 1").fetchone()
            if row and row["decision_json"]:
                return json.loads(row["decision_json"])
            return None

    def record_audit_event(self, record_type: str, record_id: str, record_hash: str, previous_hash: str, anomaly_flags: List[str]) -> None:
        with self._cursor() as cur:
            cur.execute(
                "INSERT INTO security_audit (record_type, record_id, record_hash, previous_hash, anomaly_flags, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (record_type, record_id, record_hash, previous_hash, json.dumps(anomaly_flags), time.time()),
            )
            cur.execute("DELETE FROM security_audit WHERE id < ?", (cur.lastrowid - 10000,))

    def get_latest_audit_hash(self) -> str:
        with self._cursor() as cur:
            row = cur.execute("SELECT record_hash FROM security_audit ORDER BY created_at DESC LIMIT 1").fetchone()
            return row["record_hash"] if row and row["record_hash"] else ""

    def get_security_audit_summary(self, since: Optional[float] = None) -> Dict[str, Any]:
        if since is None:
            since = time.time() - 86400
        with self._cursor() as cur:
            total = cur.execute("SELECT COUNT(*) as c FROM security_audit WHERE created_at >= ?", (since,)).fetchone()["c"]
            anomalies = cur.execute("SELECT COUNT(*) as c FROM security_audit WHERE anomaly_flags != '[]' AND created_at >= ?", (since,)).fetchone()["c"]
            return {"total_records": total, "anomalies": anomalies}
