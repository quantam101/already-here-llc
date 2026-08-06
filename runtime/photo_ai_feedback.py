"""
Labeled photo feedback and training-data export for the Photo AI Haul Scanner.

Stores original scan images, predicted entities, and user corrections so the
system can be retrained / fine-tuned on real hauling photos.  Supports export
in YOLO and COCO object-detection formats.
"""

from __future__ import annotations

import io
import json
import os
import shutil
import sqlite3
import uuid
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


HAUL_FEEDBACK_STORE = os.environ.get("HAUL_FEEDBACK_STORE", "data/haul_feedback.db").strip() or "data/haul_feedback.db"
HAUL_FEEDBACK_DIR = os.environ.get("HAUL_FEEDBACK_DIR", "data/feedback").strip() or "data/feedback"
HAUL_SCAN_IMAGES_DIR = os.environ.get("HAUL_SCAN_IMAGES_DIR", "data/scan_images").strip() or "data/scan_images"


@dataclass
class FeedbackRecord:
    id: str
    org_id: str
    scan_id: str
    created_at: str
    feedback_type: str
    notes: str
    image_path: Optional[str]
    image_width: int
    image_height: int
    predicted_entities: List[Dict[str, Any]]
    corrected_entities: List[Dict[str, Any]]


def _feedback_enabled() -> bool:
    return os.environ.get("HAUL_FEEDBACK_ENABLED", "true").lower() in ("1", "true", "yes", "on")


def _image_size(image_bytes: Optional[bytes]) -> Tuple[int, int]:
    try:
        from PIL import Image
        if not image_bytes:
            return 0, 0
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = _apply_exif_orientation(img)
            return img.size
    except Exception:
        return 0, 0


def _apply_exif_orientation(image):
    try:
        exif = image._getexif()
        if exif:
            orientation = exif.get(0x0112, 1)
            rotations = {3: 180, 6: 270, 8: 90}
            if orientation in rotations:
                return image.rotate(rotations[orientation], expand=True)
    except Exception:
        pass
    return image


class FeedbackStore:
    """
    Persist user corrections (ground-truth) for scans and export as training data.
    """

    def __init__(self, store_path: Optional[str] = None, image_dir: Optional[str] = None) -> None:
        self._store_path = store_path or HAUL_FEEDBACK_STORE
        self._image_dir = Path(image_dir or HAUL_FEEDBACK_DIR)
        self._image_dir.mkdir(parents=True, exist_ok=True)
        self._scan_image_dir = Path(HAUL_SCAN_IMAGES_DIR)
        self._scan_image_dir.mkdir(parents=True, exist_ok=True)
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
                CREATE TABLE IF NOT EXISTS feedback (
                    id TEXT PRIMARY KEY,
                    org_id TEXT NOT NULL,
                    scan_id TEXT,
                    created_at TEXT NOT NULL,
                    feedback_type TEXT,
                    notes TEXT,
                    image_path TEXT,
                    image_width INTEGER,
                    image_height INTEGER,
                    predicted_entities_json TEXT NOT NULL,
                    corrected_entities_json TEXT NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_feedback_org_created ON feedback(org_id, created_at)"
            )

    def _resolve_scan_image_path(self, scan_id: str) -> Optional[str]:
        candidates = [
            self._scan_image_dir / f"{scan_id}.jpg",
            self._scan_image_dir / f"{scan_id}.jpeg",
            self._scan_image_dir / f"{scan_id}.png",
        ]
        for p in candidates:
            if p.exists():
                return str(p)
        return None

    def record_feedback(
        self,
        org_id: str,
        scan_id: Optional[str],
        image_bytes: Optional[bytes],
        predicted_entities: List[Dict[str, Any]],
        corrected_entities: List[Dict[str, Any]],
        feedback_type: str = "correct",
        notes: str = "",
    ) -> Optional[str]:
        """
        Save a feedback record.  If image_bytes is omitted but scan_id is known,
        the original scan image is copied into the feedback directory.
        """
        if not _feedback_enabled():
            return None

        feedback_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        image_path: Optional[str] = None
        width, height = 0, 0

        if image_bytes:
            width, height = _image_size(image_bytes)
            org_dir = self._image_dir / _safe_org(org_id)
            org_dir.mkdir(parents=True, exist_ok=True)
            dest = org_dir / f"{feedback_id}.jpg"
            with open(dest, "wb") as f:
                f.write(image_bytes)
            image_path = str(dest)
        elif scan_id:
            source = self._resolve_scan_image_path(scan_id)
            if source:
                width, height = _image_size(open(source, "rb").read())
                org_dir = self._image_dir / _safe_org(org_id)
                org_dir.mkdir(parents=True, exist_ok=True)
                dest = org_dir / f"{feedback_id}.jpg"
                shutil.copy(source, dest)
                image_path = str(dest)

        record = {
            "id": feedback_id,
            "org_id": org_id,
            "scan_id": scan_id or "",
            "created_at": created_at,
            "feedback_type": feedback_type,
            "notes": notes,
            "image_path": image_path,
            "image_width": width,
            "image_height": height,
            "predicted_entities_json": json.dumps(predicted_entities, default=str),
            "corrected_entities_json": json.dumps(corrected_entities, default=str),
        }

        if self._memory_mode:
            self._memory.append(record)
            return feedback_id

        with sqlite3.connect(self._store_path) as conn:
            conn.execute(
                """
                INSERT INTO feedback (
                    id, org_id, scan_id, created_at, feedback_type, notes,
                    image_path, image_width, image_height,
                    predicted_entities_json, corrected_entities_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    feedback_id,
                    org_id,
                    record["scan_id"],
                    created_at,
                    feedback_type,
                    notes,
                    image_path,
                    width,
                    height,
                    record["predicted_entities_json"],
                    record["corrected_entities_json"],
                ),
            )
        return feedback_id

    def get_feedback(
        self,
        org_id: str,
        limit: int = 50,
        feedback_type: Optional[str] = None,
    ) -> List[FeedbackRecord]:
        if self._memory_mode:
            rows = [r for r in reversed(self._memory) if r["org_id"] == org_id]
            if feedback_type:
                rows = [r for r in rows if r["feedback_type"] == feedback_type]
            rows = rows[:limit]
        else:
            query = "SELECT * FROM feedback WHERE org_id = ?"
            params: List[Any] = [org_id]
            if feedback_type:
                query += " AND feedback_type = ?"
                params.append(feedback_type)
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            with sqlite3.connect(self._store_path) as conn:
                conn.row_factory = sqlite3.Row
                rows = conn.execute(query, params).fetchall()
        return [self._row_to_record(r) for r in rows]

    def export_yolo(
        self,
        org_id: str,
        out_dir: Optional[str] = None,
        corrected_only: bool = True,
    ) -> str:
        """
        Export feedback as a YOLOv8 object-detection dataset.  Returns the path
        to the exported directory (images/ + labels/ + data.yaml).
        """
        records = self.get_feedback(org_id, limit=10000)
        export_id = f"yolo_{org_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        root = Path(out_dir or "/tmp") / export_id
        (root / "images").mkdir(parents=True, exist_ok=True)
        (root / "labels").mkdir(parents=True, exist_ok=True)

        class_names = sorted(
            list({e.get("label", "unknown") for r in records for e in r.corrected_entities})
        )
        class_to_idx = {name: idx for idx, name in enumerate(class_names)}

        for r in records:
            entities = r.corrected_entities if corrected_only else r.predicted_entities
            if not entities or not r.image_path or not Path(r.image_path).exists():
                continue
            if r.image_width <= 0 or r.image_height <= 0:
                continue

            dest_img = root / "images" / f"{r.id}.jpg"
            shutil.copy(r.image_path, dest_img)

            label_path = root / "labels" / f"{r.id}.txt"
            with open(label_path, "w") as f:
                for e in entities:
                    bbox = e.get("pixel_bbox") or e.get("bbox")
                    if not bbox:
                        continue
                    x1, y1, x2, y2 = bbox
                    x_center = (x1 + x2) / 2.0 / r.image_width
                    y_center = (y1 + y2) / 2.0 / r.image_height
                    w = (x2 - x1) / r.image_width
                    h = (y2 - y1) / r.image_height
                    cls = class_to_idx.get(e.get("label", "unknown"), 0)
                    f.write(f"{cls} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}\n")

        with open(root / "data.yaml", "w") as f:
            f.write(
                f"path: {root.absolute()}\n"
                f"train: images\n"
                f"val: images\n"
                f"names:\n"
            )
            for i, name in enumerate(class_names):
                f.write(f"  {i}: {name}\n")

        return str(root)

    def export_coco(
        self,
        org_id: str,
        out_dir: Optional[str] = None,
        corrected_only: bool = True,
    ) -> str:
        """
        Export feedback as a COCO-format JSON dataset.  Returns the path to the
        exported directory (images/ + annotations.json).
        """
        records = self.get_feedback(org_id, limit=10000)
        export_id = f"coco_{org_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        root = Path(out_dir or "/tmp") / export_id
        (root / "images").mkdir(parents=True, exist_ok=True)

        class_names = sorted(
            list({e.get("label", "unknown") for r in records for e in r.corrected_entities})
        )
        cat_to_id = {name: i + 1 for i, name in enumerate(class_names)}

        images = []
        annotations = []
        categories = [{"id": i + 1, "name": name} for i, name in enumerate(class_names)]
        ann_id = 1

        for r in records:
            entities = r.corrected_entities if corrected_only else r.predicted_entities
            if not entities or not r.image_path or not Path(r.image_path).exists():
                continue
            if r.image_width <= 0 or r.image_height <= 0:
                continue

            dest_img = root / "images" / f"{r.id}.jpg"
            shutil.copy(r.image_path, dest_img)

            images.append(
                {
                    "id": len(images) + 1,
                    "file_name": f"{r.id}.jpg",
                    "width": r.image_width,
                    "height": r.image_height,
                }
            )

            for e in entities:
                bbox = e.get("pixel_bbox") or e.get("bbox")
                if not bbox:
                    continue
                x1, y1, x2, y2 = bbox
                w = x2 - x1
                h = y2 - y1
                annotations.append(
                    {
                        "id": ann_id,
                        "image_id": images[-1]["id"],
                        "category_id": cat_to_id.get(e.get("label", "unknown"), 1),
                        "bbox": [x1, y1, w, h],
                        "area": w * h,
                        "iscrowd": 0,
                    }
                )
                ann_id += 1

        with open(root / "annotations.json", "w") as f:
            json.dump(
                {"images": images, "annotations": annotations, "categories": categories},
                f,
                indent=2,
            )

        return str(root)

    def export_zip(
        self,
        org_id: str,
        fmt: str = "yolo",
        corrected_only: bool = True,
    ) -> str:
        """Export feedback as a zip archive and return the zip path."""
        export_dir = self.export_yolo(org_id, corrected_only=corrected_only) if fmt == "yolo" else self.export_coco(org_id, corrected_only=corrected_only)
        zip_path = f"{export_dir}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in Path(export_dir).rglob("*"):
                if p.is_file():
                    zf.write(p, p.relative_to(export_dir))
        return zip_path

    @staticmethod
    def _row_to_record(row: Any) -> FeedbackRecord:
        d = dict(row) if not isinstance(row, dict) else row
        return FeedbackRecord(
            id=d["id"],
            org_id=d["org_id"],
            scan_id=d.get("scan_id", ""),
            created_at=d["created_at"],
            feedback_type=d.get("feedback_type", ""),
            notes=d.get("notes", ""),
            image_path=d.get("image_path"),
            image_width=int(d.get("image_width", 0) or 0),
            image_height=int(d.get("image_height", 0) or 0),
            predicted_entities=json.loads(d["predicted_entities_json"]),
            corrected_entities=json.loads(d["corrected_entities_json"]),
        )


def _safe_org(org_id: str) -> str:
    """Filesystem-safe org directory name."""
    return "".join(c if c.isalnum() or c in "-_." else "_" for c in org_id)


def get_feedback_store() -> FeedbackStore:
    return FeedbackStore()
