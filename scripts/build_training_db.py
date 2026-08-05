#!/usr/bin/env python3
"""
Build a labeled training database for the Photo AI Haul Scanner from public
object-detection datasets (COCO 2017 val by default).

Images and bounding boxes are mapped to the hauling-specific catalog, then
imported into the FeedbackStore so the standard `GET /api/feedback/export`
endpoint can emit a YOLO or COCO training dataset.

Example:
    python scripts/build_training_db.py --dataset coco --max-per-class 50 --workers 8
"""

from __future__ import annotations

import argparse
import io
import json
import os
import shutil
import sys
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.request import Request, urlopen

# Add repo root to import path
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from runtime.photo_ai_feedback import FeedbackStore  # noqa: E402
from runtime.photo_ai_haul import (
    Category,
    HaulingItemSpec,
    _HAULING_ITEM_CATALOG,
)

# ---------------------------------------------------------------------------
# Dataset sources
# ---------------------------------------------------------------------------

COCO_ANNOTATIONS_URL = "http://images.cocodataset.org/annotations/annotations_trainval2017.zip"
COCO_IMAGE_BASE = "http://images.cocodataset.org/val2017"

# COCO category name -> hauling catalog key
COCO_TO_HAUL: Dict[str, str] = {
    "motorcycle": "motorcycle",
    "bicycle": "bicycle",
    "sofa": "couch",
    "chair": "chair",
    "bed": "bed",
    "dining table": "dining table",
    "potted plant": "potted plant",
    "tv": "tv",
    "laptop": "laptop",
    "refrigerator": "refrigerator",
    "microwave": "microwave",
    "oven": "oven",
    "toaster": "toaster",
    "sink": "sink",
    "backpack": "backpack",
    "suitcase": "suitcase",
    "book": "book",
    "bottle": "bottle",
    "cup": "cup",
    "bowl": "bowl",
    "vase": "vase",
    "handbag": "handbag",
    "umbrella": "umbrella",
    "sports ball": "sports ball",
    "skateboard": "skateboard",
    "tennis racket": "tennis racket",
    "baseball bat": "baseball bat",
    "baseball glove": "baseball glove",
    "skis": "skis",
    "snowboard": "snowboard",
    "surfboard": "surfboard",
    "bench": "bench",
    "keyboard": "keyboard",
    "mouse": "mouse",
    "cell phone": "cell phone",
    "clock": "clock",
}


def _download(url: str, timeout: int = 120) -> bytes:
    req = Request(url, headers={"User-Agent": "photo-ai-haul-scanner/2.0"})
    with urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _download_with_progress(url: str, dest: Path, chunk_size: int = 1024 * 1024) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return dest
    print(f"Downloading {url} -> {dest}")
    req = Request(url, headers={"User-Agent": "photo-ai-haul-scanner/2.0"})
    with urlopen(req, timeout=300) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
    return dest


# ---------------------------------------------------------------------------
# COCO loader
# ---------------------------------------------------------------------------

def _get_coco_annotations(cache_dir: Path) -> Path:
    zip_path = cache_dir / "annotations_trainval2017.zip"
    _download_with_progress(COCO_ANNOTATIONS_URL, zip_path)
    ann_path = cache_dir / "instances_val2017.json"
    if ann_path.exists():
        return ann_path
    print(f"Extracting {zip_path} ...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extract("annotations/instances_val2017.json", cache_dir)
    (cache_dir / "annotations" / "instances_val2017.json").rename(ann_path)
    shutil.rmtree(cache_dir / "annotations", ignore_errors=True)
    return ann_path


def _load_coco_records(
    ann_path: Path,
    max_per_class: int,
    max_total: int,
) -> Dict[str, List[Dict[str, Any]]]:
    """Load COCO annotations and group by image, filtering to target categories."""
    print(f"Loading COCO annotations from {ann_path} ...")
    with open(ann_path, "r") as f:
        coco = json.load(f)

    categories = {c["id"]: c["name"] for c in coco["categories"]}
    images = {img["id"]: img for img in coco["images"]}

    # category_id -> hauling key
    cat_to_haul: Dict[int, str] = {}
    for cid, name in categories.items():
        if name in COCO_TO_HAUL:
            cat_to_haul[cid] = COCO_TO_HAUL[name]

    target_cats = sorted(cat_to_haul.keys())
    print(f"Target COCO categories: {len(target_cats)}")

    per_class_count: Dict[str, int] = {name: 0 for name in COCO_TO_HAUL.values()}
    selected_image_ids: set[int] = set()
    records: Dict[str, List[Dict[str, Any]]] = {}

    for ann in coco["annotations"]:
        cid = ann["category_id"]
        if cid not in cat_to_haul:
            continue
        haul_key = cat_to_haul[cid]
        if per_class_count[haul_key] >= max_per_class:
            continue
        img_id = ann["image_id"]
        if img_id in selected_image_ids and len(records.setdefault(img_id, [])) >= 10:
            continue

        img = images[img_id]
        x, y, w, h = ann["bbox"]
        record = {
            "label": haul_key,
            "pixel_bbox": [x, y, x + w, y + h],
            "category": _HAULING_ITEM_CATALOG.get(haul_key, HaulingItemSpec(Category.GENERAL_DEBRIS, (0.0, 0.0, 0.0), 0.0, 0.0, haul_key)).category.value,
        }
        records.setdefault(img_id, []).append(record)
        per_class_count[haul_key] += 1
        selected_image_ids.add(img_id)
        if len(selected_image_ids) >= max_total:
            break

    print(f"Selected {len(selected_image_ids)} images covering {sum(per_class_count.values())} annotations")
    return {img_id: records[img_id] for img_id in selected_image_ids}


def _category_for_key(key: str) -> str:
    spec = _HAULING_ITEM_CATALOG.get(key)
    if spec:
        return spec.category.value
    return Category.GENERAL_DEBRIS.value


# ---------------------------------------------------------------------------
# Download and import
# ---------------------------------------------------------------------------

def _download_and_import(
    img_id: int,
    annotations: List[Dict[str, Any]],
    images: Dict[int, Dict[str, Any]],
    image_dir: Path,
    feedback_store: FeedbackStore,
) -> Tuple[bool, Optional[str]]:
    try:
        img = images[img_id]
        file_name = img["file_name"]
        width, height = img["width"], img["height"]
        image_path = image_dir / file_name

        if not image_path.exists():
            url = f"{COCO_IMAGE_BASE}/{file_name}"
            _download_with_progress(url, image_path)

        image_bytes = image_path.read_bytes()

        for rec in annotations:
            rec["category"] = _category_for_key(rec["label"])

        feedback_store.record_feedback(
            org_id="training",
            scan_id=None,
            image_bytes=image_bytes,
            predicted_entities=[],
            corrected_entities=annotations,
            feedback_type="synthetic",
            notes=f"COCO 2017 val: {file_name}",
        )
        return True, file_name
    except Exception as exc:
        return False, str(exc)


def build_coco_db(
    feedback_store: FeedbackStore,
    image_dir: Path,
    cache_dir: Path,
    max_per_class: int,
    max_total: int,
    workers: int,
) -> None:
    ann_path = _get_coco_annotations(cache_dir)

    with open(ann_path, "r") as f:
        coco = json.load(f)
    images = {img["id"]: img for img in coco["images"]}

    image_records = _load_coco_records(ann_path, max_per_class, max_total)

    image_dir.mkdir(parents=True, exist_ok=True)

    ok = 0
    failed = 0
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(
                _download_and_import,
                img_id,
                annotations,
                images,
                image_dir,
                feedback_store,
            ): img_id
            for img_id, annotations in image_records.items()
        }
        for future in as_completed(futures):
            success, info = future.result()
            if success:
                ok += 1
                print(f"  imported {info}")
            else:
                failed += 1
                print(f"  failed: {info}")

    print(f"Imported {ok} images ({failed} failed)")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Build hauling training database from public datasets")
    parser.add_argument("--dataset", default="coco", choices=["coco"], help="Source dataset")
    parser.add_argument("--db", default="data/haul_feedback.db", help="Feedback SQLite path")
    parser.add_argument("--image-dir", default="data/training_images", help="Directory to cache downloaded images")
    parser.add_argument("--cache-dir", default="/tmp/photo_ai_training_cache", help="Temp download cache")
    parser.add_argument("--max-per-class", type=int, default=50, help="Images per hauling class")
    parser.add_argument("--max-total", type=int, default=5000, help="Total images to import")
    parser.add_argument("--workers", type=int, default=4, help="Parallel download workers")
    parser.add_argument("--export", default=None, choices=["yolo", "coco"], help="Also export after import")
    parser.add_argument("--dry-run", action="store_true", help="Count matches without downloading images")
    args = parser.parse_args()

    cache_dir = Path(args.cache_dir)
    image_dir = Path(args.image_dir)
    feedback_store = FeedbackStore(store_path=args.db, image_dir=str(image_dir))

    if args.dry_run:
        ann_path = _get_coco_annotations(cache_dir)
        records = _load_coco_records(ann_path, args.max_per_class, args.max_total)
        print(f"Dry run: would import {len(records)} images")
        return 0

    if args.dataset == "coco":
        build_coco_db(
            feedback_store,
            image_dir,
            cache_dir,
            args.max_per_class,
            args.max_total,
            args.workers,
        )

    if args.export:
        export_path = feedback_store.export_zip("training", fmt=args.export) if args.export == "yolo" else feedback_store.export_coco("training")
        print(f"Exported training dataset: {export_path}")

    stats = feedback_store.get_feedback("training", limit=1_000_000)
    print(f"Total feedback records for 'training': {len(stats)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
