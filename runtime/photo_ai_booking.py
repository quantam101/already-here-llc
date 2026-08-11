"""
Photo-to-Quote Hauling closed-loop booking.

Transforms a scan result + customer details into a canonical business graph:
organization -> contact -> site -> equipment -> lead -> opportunity ->
hauling_job -> dispatch -> revenue_event -> review -> ai_action -> qa_score ->
analytics_event -> audit_log -> proof_of_work, and records the outcome as
labeled training feedback for the photo AI.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .canonical_graph import CanonicalGraphStore, canonical_id, get_canonical_graph_store
from .photo_ai_feedback import FeedbackStore, get_feedback_store


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _avg_confidence(entities: List[Dict[str, Any]]) -> float:
    if not entities:
        return 0.0
    values = [float(e.get("confidence", 0)) for e in entities]
    return round(sum(values) / len(values), 4)


def _primary_load_type(entities: List[Dict[str, Any]]) -> str:
    if not entities:
        return "general_debris"
    # The heaviest detected item usually drives the load category.
    top = max(entities, key=lambda e: float(e.get("est_weight_lbs", 0) or 0))
    return str(top.get("category", "general_debris"))


def build_haul_booking_records(
    scan: Dict[str, Any],
    customer: Dict[str, str],
    org_id: str = "anonymous",
    source: str = "photo-to-quote-hauler",
) -> List[Dict[str, Any]]:
    """Return a list of canonical record writes for a closed hauling booking."""
    now = _now()
    company = customer.get("company", "Unknown Organization").strip() or "Unknown Organization"
    full_name = customer.get("full_name", customer.get("fullName", "Unknown Contact")).strip() or "Unknown Contact"
    email = customer.get("email", "").strip()
    phone = customer.get("phone", "").strip()
    pickup_address = customer.get("pickup_address", customer.get("pickupAddress", "")).strip() or "needs_review"
    site_city = customer.get("site_city", customer.get("siteCity", "")).strip()
    site_zip = customer.get("site_zip", customer.get("siteZip", "")).strip()
    vehicle_type = customer.get("vehicle_type", customer.get("vehicleType", "dump_trailer")).strip() or "dump_trailer"
    notes = customer.get("notes", "").strip()

    scan_id = scan.get("scan_id", "")
    volume = float(scan.get("volume_cu_yd", 0) or 0)
    net_quote = float(scan.get("net_customer_quote_usd", 0) or 0)
    gross_quote = float(scan.get("gross_quote_usd", 0) or 0)
    scrap_recovery = float(scan.get("scrap_recovery_yield_usd", 0) or 0)
    fill_str = str(scan.get("trailer_capacity_used", "0%"))
    fill_pct = float(fill_str.replace("%", "").strip() or 0)
    entities = scan.get("entities", [])
    vision_source = scan.get("vision_source", "deterministic_local")
    driver_instructions = scan.get("driver_instructions", [])

    estimated_cents = int(round(net_quote * 100))
    confidence = _avg_confidence(entities)
    load_type = _primary_load_type(entities)

    organization_id = canonical_id("org", company)
    contact_id = canonical_id("contact", organization_id, email or full_name)
    site_id = canonical_id("site", organization_id, pickup_address)
    equipment_id = canonical_id("equipment", site_id, vehicle_type)
    lead_id = canonical_id("lead", contact_id, scan_id)
    opportunity_id = canonical_id("opp", lead_id, "Hauling")
    hauling_job_id = canonical_id("hauling", opportunity_id)
    dispatch_id = canonical_id("dispatch", opportunity_id)
    revenue_event_id = canonical_id("revenue_event", opportunity_id)
    review_id = canonical_id("review", opportunity_id)
    ai_action_id = canonical_id("ai_action", "agent_photo_ai_haul", opportunity_id)
    qa_score_id = canonical_id("qa_score", scan_id)
    analytics_id = canonical_id("analytics", scan_id)
    audit_id = canonical_id("audit", scan_id)
    proof_id = canonical_id("proof", opportunity_id)

    return [
        {
            "table": "organizations",
            "id": organization_id,
            "record": {
                "id": organization_id,
                "name": company,
                "organization_type": "lead_source",
                "source": source,
                "service_area": site_city or None,
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "contacts",
            "id": contact_id,
            "record": {
                "id": contact_id,
                "organization_id": organization_id,
                "full_name": full_name,
                "email": email or None,
                "phone": phone or None,
                "source": source,
                "consent_status": "unknown",
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "sites",
            "id": site_id,
            "record": {
                "id": site_id,
                "organization_id": organization_id,
                "contact_id": contact_id,
                "address": pickup_address,
                "city": site_city or None,
                "postal_code": site_zip or None,
                "source": source,
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "equipment",
            "id": equipment_id,
            "record": {
                "id": equipment_id,
                "site_id": site_id,
                "organization_id": organization_id,
                "equipment_type": vehicle_type,
                "capacity_cu_yd": 10.6,
                "source": source,
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "leads",
            "id": lead_id,
            "record": {
                "id": lead_id,
                "contact_id": contact_id,
                "organization_id": organization_id,
                "source_channel": source,
                "lane": "Hauling",
                "title": f"Photo-to-quote haul booking {scan_id}",
                "body": f"Load type: {load_type}. Volume: {volume} cu yd. Net quote: ${net_quote:.2f}. {notes}",
                "raw_payload_json": json.dumps(scan),
                "status": "booked",
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "opportunities",
            "id": opportunity_id,
            "record": {
                "id": opportunity_id,
                "lead_id": lead_id,
                "lane": "Hauling",
                "revenue_lane_supported": "Hauling",
                "estimated_value_cents": estimated_cents,
                "priority": "P1",
                "score": 85,
                "blocker": "Owner review required before external action.",
                "next_action": "Review, pass, reply draft, quote draft, schedule draft, or prove locally.",
                "status": "queued_for_review",
                "recommended_follow_up_date": now[:10],
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "hauling_jobs",
            "id": hauling_job_id,
            "record": {
                "id": hauling_job_id,
                "opportunity_id": opportunity_id,
                "pickup_address": pickup_address,
                "load_type": load_type,
                "estimated_volume_cu_yd": volume,
                "estimated_value_cents": estimated_cents,
                "trailer_fill_pct": fill_pct,
                "status": "booked",
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "dispatches",
            "id": dispatch_id,
            "record": {
                "id": dispatch_id,
                "job_id": hauling_job_id,
                "dispatch_status": "queued_for_review",
                "skill_match_score": 90,
                "route_fit_score": 70,
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "revenue_events",
            "id": revenue_event_id,
            "record": {
                "id": revenue_event_id,
                "opportunity_id": opportunity_id,
                "hauling_job_id": hauling_job_id,
                "event_type": "hauling_quote_projected",
                "amount_cents": estimated_cents,
                "currency": "USD",
                "status": "projected",
                "source": source,
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "reviews",
            "id": review_id,
            "record": {
                "id": review_id,
                "target_table": "opportunities",
                "target_id": opportunity_id,
                "action": "pass",
                "decision": "passed",
                "persisted_externally": 0,
                "approval_required": 1,
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "ai_actions",
            "id": ai_action_id,
            "record": {
                "id": ai_action_id,
                "agent_id": "agent_photo_ai_haul",
                "target_table": "opportunities",
                "target_id": opportunity_id,
                "action": "quote",
                "result_json": json.dumps({"lane": "Hauling", "volume_cu_yd": volume, "net_quote_usd": net_quote}),
                "recommendation": f"Book {load_type} haul; net quote ${net_quote:.2f}",
                "confidence": confidence,
                "persisted_externally": 0,
                "approval_required": 1,
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "qa_scores",
            "id": qa_score_id,
            "record": {
                "id": qa_score_id,
                "opportunity_id": opportunity_id,
                "hauling_job_id": hauling_job_id,
                "scan_id": scan_id,
                "vision_source": vision_source,
                "confidence": confidence,
                "trailer_fill_pct": fill_pct,
                "volume_cu_yd": volume,
                "estimated_value_cents": estimated_cents,
                "driver_instructions_count": len(driver_instructions),
                "score": min(100, int(round((confidence * 50) + (fill_pct / 2)))),
                "created_at": now,
                "updated_at": now,
            },
        },
        {
            "table": "analytics_events",
            "id": analytics_id,
            "record": {
                "id": analytics_id,
                "source": source,
                "module": "Hauling",
                "action": "photo_to_quote_booked",
                "target_table": "opportunities",
                "target_id": opportunity_id,
                "conversion_value_cents": estimated_cents,
                "created_at": now,
            },
        },
        {
            "table": "audit_logs",
            "id": audit_id,
            "record": {
                "id": audit_id,
                "actor": "photo_to_quote_booking_agent",
                "action": "haul_booking_closed",
                "target_table": "opportunities",
                "target_id": opportunity_id,
                "risk_level": "medium",
                "allowed": 1,
                "reason": "Closed-loop booking from photo scan; external dispatch remains approval-gated.",
                "created_at": now,
            },
        },
        {
            "table": "proof_of_work",
            "id": proof_id,
            "record": {
                "id": proof_id,
                "opportunity_id": opportunity_id,
                "module": "Hauling",
                "proof_type": "photo_to_quote_closed_loop",
                "evidence_json": json.dumps(
                    [
                        {"table": "leads", "id": lead_id},
                        {"table": "opportunities", "id": opportunity_id},
                        {"table": "hauling_jobs", "id": hauling_job_id},
                        {"table": "revenue_events", "id": revenue_event_id},
                        {"table": "qa_scores", "id": qa_score_id},
                    ]
                ),
                "outcome_summary": f"Photo-to-quote booking closed: {load_type}, {volume} cu yd, ${net_quote:.2f} net, {len(entities)} entities.",
                "reusable_product_candidate": 1,
                "created_at": now,
                "updated_at": now,
            },
        },
    ]


def create_haul_booking(
    scan: Dict[str, Any],
    customer: Dict[str, str],
    org_id: str = "anonymous",
    source: str = "photo-to-quote-hauler",
    store: Optional[CanonicalGraphStore] = None,
    feedback_store: Optional[FeedbackStore] = None,
) -> Dict[str, Any]:
    """Persist a closed hauling booking and training feedback, returning record IDs."""
    store = store or get_canonical_graph_store()
    if feedback_store is None:
        feedback_store = get_feedback_store()
    writes = build_haul_booking_records(scan, customer, org_id, source)
    ids = store.write_many(writes)

    # Build a quick lookup for the key IDs.
    id_map: Dict[str, str] = {write["table"]: write["id"] for write in writes}

    feedback_id: Optional[str] = None
    try:
        feedback_id = feedback_store.record_feedback(
            org_id=org_id,
            scan_id=scan.get("scan_id"),
            image_bytes=None,
            predicted_entities=scan.get("entities", []),
            corrected_entities=[],
            feedback_type="booking_complete",
            notes=json.dumps(
                {
                    "opportunity_id": id_map.get("opportunities"),
                    "hauling_job_id": id_map.get("hauling_jobs"),
                    "revenue_event_id": id_map.get("revenue_events"),
                    "net_quote_usd": scan.get("net_customer_quote_usd"),
                },
                default=str,
            ),
        )
    except Exception:
        # Feedback is best-effort; do not fail the booking if it is unavailable.
        pass

    return {
        "ok": True,
        "booking_id": id_map.get("opportunities"),
        "canonical_ids": id_map,
        "record_count": len(ids),
        "feedback_id": feedback_id,
    }
