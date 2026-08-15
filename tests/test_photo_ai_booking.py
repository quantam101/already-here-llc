"""Tests for the Photo-to-Quote Hauling closed-loop booking graph."""

import io
import json
import os
from pathlib import Path

import pytest
from PIL import Image

from runtime.canonical_graph import CanonicalGraphStore, get_canonical_graph_store
from runtime.photo_ai_booking import build_haul_booking_records, create_haul_booking
from runtime.photo_ai_haul import HaulScanner


def _blank_jpeg_bytes() -> bytes:
    img = Image.new("RGB", (640, 480), color=(120, 120, 120))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _fresh_store(tmp_path: Path) -> CanonicalGraphStore:
    db = tmp_path / "canonical-graph-test.db"
    os.environ["CANONICAL_SQLITE_PATH"] = str(db)
    return get_canonical_graph_store(str(db))


@pytest.mark.asyncio
async def test_haul_booking_persists_full_graph(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("HAUL_FEEDBACK_STORE", "memory")
    store = _fresh_store(tmp_path)

    scanner = HaulScanner()
    scanner.boot()
    try:
        result = await scanner.scan(_blank_jpeg_bytes(), filename="test.jpg")
    finally:
        scanner.shutdown()

    customer = {
        "full_name": "Test User",
        "company": "Test Co",
        "email": "test@example.com",
        "phone": "555-1234",
        "pickup_address": "123 Main St",
        "site_city": "Phoenix",
        "site_zip": "85001",
        "vehicle_type": "dump_trailer",
        "notes": "gate code 1234",
    }
    booking = create_haul_booking(result.__dict__, customer, org_id="org_test", store=store)

    assert booking["ok"] is True
    assert booking["record_count"] >= 14
    assert booking["booking_id"].startswith("opp_")

    for table in [
        "organizations",
        "contacts",
        "sites",
        "equipment",
        "leads",
        "opportunities",
        "hauling_jobs",
        "dispatches",
        "revenue_events",
        "reviews",
        "ai_actions",
        "qa_scores",
        "analytics_events",
        "audit_logs",
        "proof_of_work",
    ]:
        assert store.query(table), f"missing table {table}"

    opportunity = store.read("opportunities", booking["booking_id"])
    assert opportunity is not None
    assert opportunity["lane"] == "Hauling"
    assert opportunity["estimated_value_cents"] > 0

    qa = store.query("qa_scores")[0]
    assert qa["scan_id"] == result.scan_id
    assert isinstance(qa["score"], (int, float))
