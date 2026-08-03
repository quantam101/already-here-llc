"""Unit tests for the photo AI hauling scanner."""

from __future__ import annotations

import io
import os
from typing import Any, Dict

import numpy as np
import pytest
from PIL import Image

from runtime.photo_ai_haul import (
    Category,
    DetectedEntity,
    HaulScanner,
    ScrapRateProvider,
    _analyze_image_bytes,
    _apply_exif_orientation,
    _classify_dominant_color,
    _coerce_entity,
    _density_for_category,
    _estimate_bounding_box,
    _label_for_category,
    _resale_estimate,
    _rgb_to_hsv,
    asset_recovery_agent,
    volumetric_pricing_agent,
    vision_spatial_agent,
)


@pytest.fixture
def scanner(tmp_path, monkeypatch):
    monkeypatch.setenv("GMAOS_AUDIT_LOG", str(tmp_path / "audit.jsonl"))
    monkeypatch.setenv("GMAOS_MODE", "strict_zero_spend")
    monkeypatch.setenv("GMAOS_PAID_ADAPTERS_ENABLED", "false")
    s = HaulScanner()
    s.boot()
    yield s
    s.shutdown()


def _make_image_bytes(mode: str = "RGB", size: tuple = (640, 480), color: tuple = (128, 128, 128)) -> bytes:
    img = Image.new(mode, size, color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_rgb_to_hsv_shape():
    rgb = np.random.randint(0, 256, (4, 4, 3), dtype=np.uint8)
    hsv = _rgb_to_hsv(rgb)
    assert hsv.shape == (4, 4, 3)
    assert hsv.dtype == np.float32


def test_classify_dominant_color_metallic():
    cat, conf = _classify_dominant_color(np.array([30.0, 15.0, 90.0]))
    assert cat == Category.SCRAP_METAL
    assert conf > 0


def test_label_and_density_maps():
    for c in Category:
        assert _label_for_category(c)
        assert 0 < _density_for_category(c) <= 1.0


def test_estimate_bounding_box_dimensions():
    l, w, h = _estimate_bounding_box(Category.BULKY_FURNITURE, 100_000, 10_000)
    assert l >= w
    assert h > 0


def test_resale_estimate_furniture():
    assert _resale_estimate(Category.BULKY_FURNITURE, 50.0) == 40.0
    assert _resale_estimate(Category.GENERAL_DEBRIS, 50.0) == 0.0


def test_coerce_entity_defaults():
    entity = _coerce_entity({"label": "Sofa"})
    assert entity["category"] == Category.GENERAL_DEBRIS
    assert entity["est_weight_lbs"] == 10.0
    assert entity["bounding_box_3d_m"] == [1.0, 1.0, 0.6]


def test_scrap_rate_provider_fallback():
    provider = ScrapRateProvider()
    rates = provider.get_rates()
    assert rates.copper_lbs_usd > 0
    assert rates.to_dict()["copper"] > 0


def test_analyze_image_bytes_produces_entities():
    img_bytes = _make_image_bytes(color=(180, 180, 180))
    entities, features, source = _analyze_image_bytes(img_bytes, "scan_1")
    assert entities
    assert "width_px" in features
    assert source == "deterministic_local"


def test_volumetric_pricing_agent():
    payload: Dict[str, Any] = {
        "entities": [
            {
                "label": "Sofa",
                "category": Category.BULKY_FURNITURE.value,
                "bounding_box_3d_m": [2.0, 1.0, 0.8],
                "est_weight_lbs": 80.0,
                "density_coefficient": 0.65,
                "confidence": 0.8,
                "resale_potential_usd": 40.0,
            }
        ]
    }
    result = volumetric_pricing_agent(payload)
    assert result["total_volume_cu_yd"] > 0
    assert result["gross_quote_usd"] >= os.environ.get("HAUL_BASE_DISPATCH_FEE_USD", 75.0)


def test_asset_recovery_agent_copper():
    payload: Dict[str, Any] = {
        "entities": [
            {
                "label": "Copper Pipe",
                "category": Category.SCRAP_METAL.value,
                "bounding_box_3d_m": [1.0, 0.2, 0.2],
                "est_weight_lbs": 32.5,
                "density_coefficient": 0.95,
                "confidence": 0.9,
                "resale_potential_usd": 0.0,
            }
        ]
    }
    result = asset_recovery_agent(payload)
    assert result["total_recovery_yield_usd"] > 0
    assert any("SCRAP" in i for i in result["driver_instructions"])


def test_vision_spatial_agent_local(monkeypatch):
    monkeypatch.setenv("GMAOS_MODE", "strict_zero_spend")
    monkeypatch.setenv("GMAOS_PAID_ADAPTERS_ENABLED", "false")
    monkeypatch.setenv("HAUL_YOLO_ENABLED", "false")
    import base64

    payload = {
        "scan_id": "scan_test",
        "image_b64": base64.b64encode(_make_image_bytes()).decode("ascii"),
        "allow_cloud": False,
        "cloud_model": "gemini-2.5-flash",
    }
    result = vision_spatial_agent(payload)
    assert result["source"] == "deterministic_local"
    assert result["entities"]


def test_haul_scan_end_to_end(scanner):
    import asyncio

    result = asyncio.run(scanner.scan(_make_image_bytes(color=(160, 120, 80)), "test.jpg"))
    assert result.volume_cu_yd >= 0
    assert result.gross_quote_usd >= 0
    assert result.net_customer_quote_usd >= 0
    assert result.scan_id.startswith("SCAN_")
