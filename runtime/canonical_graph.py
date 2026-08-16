"""
Shared SQLite-backed canonical business graph store for Python runtimes.

Mirrors the TypeScript `lib/canonical-store.ts` schema so that Next.js and
Python processes can read and write the same `canonical_records` table when
`CANONICAL_SQLITE_PATH` points at the same on-disk database.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def canonical_id(prefix: str, *components: Any) -> str:
    """Deterministic canonical ID compatible with lib/canonical-ids.ts."""
    value = "::".join(str(c) for c in components if c is not None)
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]
    return f"{prefix}_{digest}"


def canonical_slug(value: str) -> str:
    """Normalize a string to a lowercase, underscore-delimited slug."""
    return re.sub(r"^_+|_+$", "", re.sub(r"[^a-z0-9]+", "_", value.lower()))[:64]


def normalize_email(value: Optional[str]) -> str:
    return value.strip().lower() if isinstance(value, str) else ""


def normalize_phone(value: Optional[str]) -> str:
    return re.sub(r"[^0-9+]", "", value) if isinstance(value, str) else ""


def normalize_domain(value: Optional[str] = None, website: Optional[str] = None, email: Optional[str] = None) -> str:
    explicit = value.strip().lower().removeprefix("www.") if isinstance(value, str) else ""
    if explicit and "." in explicit:
        return explicit
    urlish = website.strip() if isinstance(website, str) else ""
    if urlish:
        try:
            from urllib.parse import urlparse
            url = urlish if urlish.startswith("http://") or urlish.startswith("https://") else f"https://{urlish}"
            host = urlparse(url).hostname or ""
            host = host.lower().removeprefix("www.")
            if "." in host:
                return host
        except Exception:
            pass
    mail = email.strip().lower() if isinstance(email, str) else ""
    at = mail.find("@")
    if 0 < at < len(mail) - 1:
        host = mail[at + 1 :]
        if "." in host:
            return host
    return ""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _merge_records(existing: Optional[Dict[str, Any]], incoming: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(existing or {})
    for key, value in incoming.items():
        if value is not None:
            merged[key] = value
        elif key not in merged:
            merged[key] = value
    return merged


class CanonicalGraphStore:
    """Write/read generic canonical graph records to a SQLite `canonical_records` table."""

    def __init__(self, path: Optional[str] = None) -> None:
        self.path = path or os.environ.get("CANONICAL_SQLITE_PATH") or "data/canonical-graph.db"
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode = WAL;")
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS canonical_records (
                id TEXT PRIMARY KEY,
                table_name TEXT NOT NULL,
                payload TEXT NOT NULL,
                source TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_canonical_records_table ON canonical_records(table_name);
            CREATE INDEX IF NOT EXISTS idx_canonical_records_source ON canonical_records(source);
            CREATE INDEX IF NOT EXISTS idx_canonical_records_created ON canonical_records(created_at DESC);
            """
        )
        self._conn.commit()

    def write(self, table: str, id: str, record: Dict[str, Any], source: str = "", action: str = "insert") -> None:
        now = _now()
        existing = self.read(table, id) if action == "upsert" else None
        merged = {
            **_merge_records(existing, record),
            "id": id,
            "_table": table,
            "_canonical_id": id,
            "created_at": (existing or {}).get("created_at") or record.get("created_at") or now,
            "updated_at": now,
            "source": record.get("source") or (existing or {}).get("source") or source or table,
        }
        payload = json.dumps(merged, default=str)
        with self._conn:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO canonical_records (id, table_name, payload, source, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (id, table, payload, merged["source"], merged["created_at"], merged["updated_at"]),
            )

    def write_many(self, writes: List[Dict[str, Any]], source: str = "") -> List[str]:
        """Writes is a list of {"table": str, "id": str, "record": dict, "action": str}."""
        ids: List[str] = []
        for write in writes:
            table = write["table"]
            id = write["id"]
            record = write.get("record", {})
            self.write(table, id, record, write.get("source") or source, write.get("action", "insert"))
            ids.append(id)
        return ids

    def read(self, table: str, id: str) -> Optional[Dict[str, Any]]:
        row = self._conn.execute(
            "SELECT payload FROM canonical_records WHERE table_name = ? AND id = ?",
            (table, id),
        ).fetchone()
        if not row:
            return None
        return json.loads(row[0])

    def query(self, table: str, limit: int = 1000) -> List[Dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT payload FROM canonical_records WHERE table_name = ? ORDER BY created_at DESC LIMIT ?",
            (table, limit),
        ).fetchall()
        return [json.loads(r[0]) for r in rows]

    def query_all(self, limit: int = 1000) -> List[Dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT payload FROM canonical_records ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [json.loads(r[0]) for r in rows]

    def close(self) -> None:
        self._conn.close()


_singleton: Optional[CanonicalGraphStore] = None


def get_canonical_graph_store(path: Optional[str] = None) -> CanonicalGraphStore:
    global _singleton
    if _singleton is None:
        _singleton = CanonicalGraphStore(path)
    return _singleton


def reset_canonical_graph_store() -> None:
    global _singleton
    if _singleton:
        _singleton.close()
        _singleton = None
