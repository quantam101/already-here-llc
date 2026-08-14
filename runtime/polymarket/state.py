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
                """
            )

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
                    entry_price, exit_price, pnl, roi, strategy)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
                   (id, opened_at, wallet, token_id, side, shares, entry_price, amount)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    position["id"],
                    position.get("opened_at", time.time()),
                    position.get("wallet", "").lower(),
                    position.get("token_id", "").lower(),
                    position.get("side", ""),
                    float(position.get("shares", 0)),
                    float(position.get("entry_price", 0)),
                    float(position.get("amount", 0)),
                ),
            )

    def get_open_paper_positions(self) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            rows = cur.execute("SELECT * FROM paper_positions WHERE closed = 0 ORDER BY opened_at").fetchall()
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
