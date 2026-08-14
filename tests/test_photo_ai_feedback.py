import base64
import os
import tempfile
from pathlib import Path

import pytest

from runtime.photo_ai_feedback import FeedbackStore


@pytest.fixture
def feedback_store(tmp_path, monkeypatch):
    monkeypatch.setenv("HAUL_FEEDBACK_ENABLED", "true")
    db = tmp_path / "feedback.db"
    img_dir = tmp_path / "feedback"
    scan_dir = tmp_path / "scan_images"
    return FeedbackStore(store_path=str(db), image_dir=str(img_dir))


def _make_image_bytes():
    from PIL import Image
    import io

    img = Image.new("RGB", (64, 64), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_record_feedback_with_image(feedback_store):
    img = _make_image_bytes()
    fid = feedback_store.record_feedback(
        org_id="acme",
        scan_id="SCAN_123",
        image_bytes=img,
        predicted_entities=[{"label": "box", "pixel_bbox": [0, 0, 10, 10]}],
        corrected_entities=[{"label": "cardboard box", "pixel_bbox": [1, 1, 11, 11]}],
        feedback_type="correct",
        notes=" corrected label",
    )
    assert fid is not None
    rec = feedback_store.get_feedback("acme")[0]
    assert rec.scan_id == "SCAN_123"
    assert rec.corrected_entities[0]["label"] == "cardboard box"
    assert rec.image_width == 64
    assert rec.image_height == 64
    assert Path(rec.image_path).exists()


def test_feedback_disabled(monkeypatch):
    monkeypatch.setenv("HAUL_FEEDBACK_ENABLED", "false")
    store = FeedbackStore(store_path=":memory:")
    assert store.record_feedback(
        org_id="acme",
        scan_id="SCAN_123",
        image_bytes=b"",
        predicted_entities=[],
        corrected_entities=[],
    ) is None


def test_export_yolo(feedback_store):
    img = _make_image_bytes()
    feedback_store.record_feedback(
        org_id="acme",
        scan_id="SCAN_1",
        image_bytes=img,
        predicted_entities=[],
        corrected_entities=[
            {"label": "motor scooter", "pixel_bbox": [0, 0, 32, 32]},
            {"label": "pool table", "pixel_bbox": [32, 32, 64, 64]},
        ],
    )
    out = feedback_store.export_yolo("acme", out_dir=str(tempfile.gettempdir()))
    assert Path(out).exists()
    assert (Path(out) / "data.yaml").exists()
    assert (Path(out) / "images").exists()
    assert (Path(out) / "labels").exists()


def test_export_coco(feedback_store):
    img = _make_image_bytes()
    feedback_store.record_feedback(
        org_id="acme",
        scan_id="SCAN_2",
        image_bytes=img,
        predicted_entities=[],
        corrected_entities=[{"label": "helmet", "pixel_bbox": [10, 10, 20, 20]}],
    )
    out = feedback_store.export_coco("acme", out_dir=str(tempfile.gettempdir()))
    assert Path(out).exists()
    assert (Path(out) / "annotations.json").exists()


def test_export_zip(feedback_store):
    img = _make_image_bytes()
    feedback_store.record_feedback(
        org_id="acme",
        scan_id="SCAN_3",
        image_bytes=img,
        predicted_entities=[],
        corrected_entities=[{"label": "couch", "pixel_bbox": [0, 0, 64, 64]}],
    )
    zip_path = feedback_store.export_zip("acme", fmt="yolo")
    assert Path(zip_path).exists()
    assert Path(zip_path).suffix == ".zip"
