"""
Lightweight per-organization scan persistence and billing store for the
Photo AI Haul Scanner.

Defaults to an on-disk SQLite database (`data/haul_scans.db`) and supports
HAUL_SCAN_STORE=memory for testing or ephemeral deployments.  No image bytes
are persisted; only quote, recovery, and source metadata.
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


HAUL_SCAN_STORE = os.environ.get("HAUL_SCAN_STORE", "data/haul_scans.db").strip() or "data/haul_scans.db"


@dataclass
class ScanRecord:
    id: str
    org_id: str
    scan_id: str
    created_at: str
    vision_source: str
    volume_cu_yd: float
    gross_quote_usd: float
    net_customer_quote_usd: float
    scrap_recovery_yield_usd: float
    trailer_fill_pct: float
    entities: List[Dict[str, Any]]


class ScanStore:
    """Persist scan results and provide per-org usage / billing metrics."""

    def __init__(self, store_path: Optional[str] = None) -> None:
        self._store_path = store_path or HAUL_SCAN_STORE
        self._memory: List[Dict[str, Any]] = []
        self._memory_mode = self._store_path.lower() == "memory"
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        if self._memory_mode:
            return
        Path(self._store_path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self._store_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS scans (
                    id TEXT PRIMARY KEY,
                    org_id TEXT NOT NULL,
                    scan_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    vision_source TEXT NOT NULL,
                    volume_cu_yd REAL NOT NULL,
                    gross_quote_usd REAL NOT NULL,
                    net_customer_quote_usd REAL NOT NULL,
                    scrap_recovery_yield_usd REAL NOT NULL,
                    trailer_fill_pct REAL NOT NULL,
                    entities_json TEXT NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_scans_org_created ON scans(org_id, created_at)")

    def record_scan(
        self,
        org_id: str,
        scan_id: str,
        vision_source: str,
        volume_cu_yd: float,
        gross_quote_usd: float,
        net_customer_quote_usd: float,
        scrap_recovery_yield_usd: float,
        trailer_fill_pct: float,
        entities: List[Dict[str, Any]],
    ) -> str:
        record_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        record: Dict[str, Any] = {
            "id": record_id,
            "org_id": org_id,
            "scan_id": scan_id,
            "created_at": created_at,
            "vision_source": vision_source,
            "volume_cu_yd": volume_cu_yd,
            "gross_quote_usd": gross_quote_usd,
            "net_customer_quote_usd": net_customer_quote_usd,
            "scrap_recovery_yield_usd": scrap_recovery_yield_usd,
            "trailer_fill_pct": trailer_fill_pct,
            "entities_json": json.dumps(entities, default=str),
        }
        if self._memory_mode:
            self._memory.append(record)
            return record_id

        with sqlite3.connect(self._store_path) as conn:
            conn.execute(
                """
                INSERT INTO scans (
                    id, org_id, scan_id, created_at, vision_source,
                    volume_cu_yd, gross_quote_usd, net_customer_quote_usd,
                    scrap_recovery_yield_usd, trailer_fill_pct, entities_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record_id,
                    org_id,
                    scan_id,
                    created_at,
                    vision_source,
                    volume_cu_yd,
                    gross_quote_usd,
                    net_customer_quote_usd,
                    scrap_recovery_yield_usd,
                    trailer_fill_pct,
                    record["entities_json"],
                ),
            )
        return record_id

    def get_scan_history(self, org_id: str, limit: int = 50) -> List[ScanRecord]:
        if self._memory_mode:
            rows = [r for r in reversed(self._memory) if r["org_id"] == org_id][:limit]
        else:
            with sqlite3.connect(self._store_path) as conn:
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    """
                    SELECT * FROM scans
                    WHERE org_id = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (org_id, limit),
                ).fetchall()
        return [self._row_to_record(r) for r in rows]

    def get_usage(self, org_id: str, period_days: int = 30) -> Dict[str, Any]:
        # Simplistic rolling-window query; date arithmetic handled in Python for portability.
        records = self._records_for_org(org_id)
        cutoff = datetime.now(timezone.utc).timestamp() - period_days * 86400
        period_records = [
            r for r in records
            if datetime.fromisoformat(r["created_at"]).timestamp() >= cutoff
        ]
        total = len(records)
        return {
            "total_scans": total,
            "period_scans": len(period_records),
            "period_volume_cu_yd": round(sum(r["volume_cu_yd"] for r in period_records), 2),
            "period_gross_usd": round(sum(r["gross_quote_usd"] for r in period_records), 2),
            "period_net_usd": round(sum(r["net_customer_quote_usd"] for r in period_records), 2),
            "period_recovery_usd": round(sum(r["scrap_recovery_yield_usd"] for r in period_records), 2),
        }

    def get_billing(self, org_id: str) -> Dict[str, Any]:
        """Return billable aggregates.  10% platform fee on gross quotes."""
        records = self._records_for_org(org_id)
        gross = sum(r["gross_quote_usd"] for r in records)
        recovery = sum(r["scrap_recovery_yield_usd"] for r in records)
        platform_fee_usd = round(gross * 0.10, 2)
        return {
            "org": org_id,
            "total_scans": len(records),
            "gross_revenue_usd": round(gross, 2),
            "net_recovery_value_usd": round(recovery, 2),
            "platform_fee_usd": platform_fee_usd,
            "estimated_payout_usd": round(gross - platform_fee_usd, 2),
        }

    def _records_for_org(self, org_id: str) -> List[Dict[str, Any]]:
        if self._memory_mode:
            return [r for r in self._memory if r["org_id"] == org_id]
        with sqlite3.connect(self._store_path) as conn:
            conn.row_factory = sqlite3.Row
            return [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM scans WHERE org_id = ? ORDER BY created_at DESC",
                    (org_id,),
                ).fetchall()
            ]

    @staticmethod
    def _row_to_record(row: Any) -> ScanRecord:
        d = dict(row) if not isinstance(row, dict) else row
        return ScanRecord(
            id=d["id"],
            org_id=d["org_id"],
            scan_id=d["scan_id"],
            created_at=d["created_at"],
            vision_source=d["vision_source"],
            volume_cu_yd=d["volume_cu_yd"],
            gross_quote_usd=d["gross_quote_usd"],
            net_customer_quote_usd=d["net_customer_quote_usd"],
            scrap_recovery_yield_usd=d["scrap_recovery_yield_usd"],
            trailer_fill_pct=d["trailer_fill_pct"],
            entities=json.loads(d["entities_json"]),
        )


def get_store() -> ScanStore:
    return ScanStore()
