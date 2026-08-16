"""
OCI Canonical Graph Server
==========================

Durable HTTP persistence layer for the Already Here canonical business graph.

Runs on a persistent OCI (or any VM) host. Next.js uses the TypeScript
RemoteCanonicalStore client to read/write over HTTPS with API-key auth.

Required environment variables:
    CANONICAL_API_KEY            API key that clients must send in X-API-Key.
    CANONICAL_SQLITE_PATH        Path to the authoritative SQLite database.
    CANONICAL_BACKUP_DIR         Directory for hot backups (default: ./backups).
    CANONICAL_HOST               Bind host (default: 0.0.0.0)
    CANONICAL_PORT               Bind port (default: 8443)
"""

from __future__ import annotations

import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from runtime.canonical_graph import CanonicalGraphStore


class CanonicalWrite(BaseModel):
    table: str
    id: str
    record: Dict[str, Any] = Field(default_factory=dict)
    source: Optional[str] = None


class BatchWriteRequest(BaseModel):
    writes: List[CanonicalWrite]


class HealthCheck(BaseModel):
    ok: bool
    mode: str = "oci_canonical_graph_server"
    sqlite_path: str
    backup_dir: str
    uptime_seconds: float
    db_size_bytes: int
    wal_size_bytes: int
    backups_available: int
    timestamp: str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_api_key(
    x_api_key: str = Header(default="", alias="X-API-Key"),
) -> str:
    expected = os.environ.get("CANONICAL_API_KEY", "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server not configured with CANONICAL_API_KEY",
        )
    if not x_api_key or x_api_key.strip() != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header",
        )
    return x_api_key


class _State:
    def __init__(self) -> None:
        self.started_at = time.time()
        self.sqlite_path = os.environ.get(
            "CANONICAL_SQLITE_PATH", "data/oci-canonical-graph.db"
        )
        self.backup_dir = os.environ.get("CANONICAL_BACKUP_DIR", "backups")
        Path(self.backup_dir).mkdir(parents=True, exist_ok=True)
        self.store = CanonicalGraphStore(self.sqlite_path)
        self.checkpoint()

    def checkpoint(self) -> None:
        with self.store._conn:
            self.store._conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")

    def db_size_bytes(self) -> int:
        path = Path(self.sqlite_path)
        return path.stat().st_size if path.exists() else 0

    def wal_size_bytes(self) -> int:
        path = Path(self.sqlite_path + "-wal")
        return path.stat().st_size if path.exists() else 0

    def backup_list(self) -> List[str]:
        if not Path(self.backup_dir).exists():
            return []
        return sorted(
            p.name for p in Path(self.backup_dir).glob("*.db") if p.is_file()
        )


state = _State()
app = FastAPI(
    title="Already Here OCI Canonical Graph Server",
    version="1.0.0",
)


@app.get("/health", response_model=HealthCheck)
async def health(auth: str = Depends(_require_api_key)) -> Dict[str, Any]:
    backups = state.backup_list()
    return {
        "ok": True,
        "mode": "oci_canonical_graph_server",
        "sqlite_path": state.sqlite_path,
        "backup_dir": state.backup_dir,
        "uptime_seconds": round(time.time() - state.started_at, 3),
        "db_size_bytes": state.db_size_bytes(),
        "wal_size_bytes": state.wal_size_bytes(),
        "backups_available": len(backups),
        "timestamp": _now(),
    }


@app.post("/write")
async def write_one(
    payload: CanonicalWrite,
    auth: str = Depends(_require_api_key),
) -> Dict[str, Any]:
    source = payload.source or payload.table
    state.store.write(payload.table, payload.id, payload.record, source)
    return {"ok": True, "id": payload.id, "table": payload.table}


@app.post("/write-many")
async def write_many(
    body: BatchWriteRequest,
    auth: str = Depends(_require_api_key),
) -> Dict[str, Any]:
    writes = []
    for w in body.writes:
        record = w.record or {}
        record["source"] = record.get("source") or w.source or w.table
        writes.append({"table": w.table, "id": w.id, "record": record})
    inserted = state.store.write_many(writes)
    return {"ok": True, "insertedIds": inserted, "failed": []}


@app.get("/read/{table}/{id}")
async def read_record(
    table: str,
    id: str,
    auth: str = Depends(_require_api_key),
) -> Dict[str, Any]:
    record = state.store.read(table, id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@app.get("/query/{table}")
async def query_table(
    table: str,
    limit: int = 1000,
    auth: str = Depends(_require_api_key),
) -> List[Dict[str, Any]]:
    return state.store.query(table, limit)


@app.get("/query")
async def query_all(
    limit: int = 1000,
    auth: str = Depends(_require_api_key),
) -> List[Dict[str, Any]]:
    return state.store.query_all(limit)


@app.post("/backup")
async def backup(auth: str = Depends(_require_api_key)) -> Dict[str, Any]:
    state.checkpoint()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_name = f"canonical-graph-{timestamp}.db"
    backup_path = Path(state.backup_dir) / backup_name
    shutil.copy2(state.sqlite_path, backup_path)
    return {
        "ok": True,
        "backup_name": backup_name,
        "backup_path": str(backup_path),
        "db_size_bytes": state.db_size_bytes(),
        "timestamp": _now(),
    }


@app.get("/backup/list")
async def list_backups(auth: str = Depends(_require_api_key)) -> Dict[str, Any]:
    backups = []
    for name in state.backup_list():
        path = Path(state.backup_dir) / name
        backups.append(
            {"name": name, "size_bytes": path.stat().st_size, "modified": path.stat().st_mtime}
        )
    return {"ok": True, "backups": backups}


@app.post("/restore/{backup_name}")
async def restore_backup(
    backup_name: str,
    auth: str = Depends(_require_api_key),
) -> Dict[str, Any]:
    backup_path = Path(state.backup_dir) / backup_name
    if not backup_path.exists() or not backup_path.is_file():
        raise HTTPException(status_code=404, detail="Backup not found")
    state.store.close()
    shutil.copy2(str(backup_path), state.sqlite_path)
    state.store = CanonicalGraphStore(state.sqlite_path)
    return {"ok": True, "restored_from": backup_name, "timestamp": _now()}


@app.post("/flush")
async def flush(auth: str = Depends(_require_api_key)) -> Dict[str, Any]:
    state.checkpoint()
    return {"ok": True, "timestamp": _now()}


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "service": "already-here-oci-canonical-graph-server",
        "health": "/health",
        "write": "POST /write",
        "write_many": "POST /write-many",
        "read": "GET /read/{table}/{id}",
        "query": "GET /query/{table}?limit=...",
        "backup": "POST /backup",
        "restore": "POST /restore/{backup_name}",
    }


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("CANONICAL_HOST", "0.0.0.0")
    port = int(os.environ.get("CANONICAL_PORT", "8443"))
    uvicorn.run(app, host=host, port=port)
