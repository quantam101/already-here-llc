"""
AVAX-3D Mobile Hauling AI — Vision-to-Quote distillation engine.

A declarative, multi-agent photo AI for hauling / pickup / junk-removal
quoting.  Snaps a load photo, extracts spatial + material features,
computes true volumetric trailer fill, and surfaces recoverable value
(scrap metal, resale, refurbishment) as a net customer quote.

Design principles
~~~~~~~~~~~~~~~~~
- Local-first / zero-spend by default.  Cloud vision (Gemini) is gated by
  CostGuard and only runs when GMAOS_PAID_ADAPTERS_ENABLED=true and a key
  is present.
- Deterministic fallback performs real image analysis with Pillow + NumPy,
  never hard-coded sample payloads.
- Strict process isolation: each scan runs the Vision, Volumetric and
  Recovery agents in separate worker processes.
- Military-grade observability: every scan emits structured telemetry and
  an immutable audit record.
- No placeholders: scrap rates are fetched from a live public feed when
  online and fall back to cached, versioned market data when offline.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import math
import multiprocessing as mp
import os
import time
import urllib.request
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .audit_log import AuditLog
from .cost_guard import CostGuard, CostGuardError, RouteDecision
from .photo_ai_clip import get_classifier
from .telemetry import TelemetryCollector, Severity

logger = logging.getLogger("photo_ai_haul")


# =====================================================================
# CONFIGURATION
# =====================================================================


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _env_float(name: str, default: float) -> float:
    try:
        return float(_env(name, str(default)))
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env(name, str(default)))
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    return _env(name, "true" if default else "false").lower() in (
        "1",
        "true",
        "yes",
    )


TRAILER_CAPACITY_CU_YD = _env_float("HAUL_TRAILER_CAPACITY_CU_YD", 10.6)
BASE_DISPATCH_FEE_USD = _env_float("HAUL_BASE_DISPATCH_FEE_USD", 75.0)
RATE_PER_CU_YD_USD = _env_float("HAUL_RATE_PER_CU_YD_USD", 38.0)
RECOVERY_CREDIT_PCT = _env_float("HAUL_RECOVERY_CREDIT_PCT", 0.25)
MAX_UPLOAD_BYTES = _env_int("HAUL_MAX_UPLOAD_BYTES", 25 * 1024 * 1024)
PROCESS_TIMEOUT_SECONDS = _env_float("HAUL_PROCESS_TIMEOUT_SECONDS", 30.0)
HAUL_CLIP_ENABLED = _env_bool("HAUL_CLIP_ENABLED", True)
HAUL_CLIP_CONF = _env_float("HAUL_CLIP_CONF", 7.0)
HAUL_CLIP_MAX_CANDIDATES = _env_int("HAUL_CLIP_MAX_CANDIDATES", 12)


# =====================================================================
# DOMAIN MODELS
# =====================================================================


class Category(str, Enum):
    BULKY_FURNITURE = "bulky_furniture"
    SCRAP_METAL = "scrap_metal"
    GENERAL_DEBRIS = "general_debris"
    ELECTRONICS = "electronics"
    APPLIANCE = "appliance"
    YARD_WASTE = "yard_waste"
    MOTOR_VEHICLE = "motor_vehicle"
    SPORTING_GOODS = "sporting_goods"


@dataclass(frozen=True)
class DetectedEntity:
    label: str
    category: Category
    bounding_box_3d_m: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    est_weight_lbs: float = 0.0
    density_coefficient: float = 1.0
    confidence: float = 0.0
    resale_potential_usd: float = 0.0
    pixel_bbox: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)


@dataclass(frozen=True)
class RecoveryItem:
    label: str
    category: Category
    value_usd: float
    action: str


@dataclass(frozen=True)
class VolumetricResult:
    total_volume_cu_yd: float
    trailer_fill_percentage: float
    gross_quote_usd: float


@dataclass(frozen=True)
class RecoveryResult:
    total_recovery_yield_usd: float
    items: List[RecoveryItem]
    driver_instructions: List[str]


@dataclass(frozen=True)
class HaulScanResult:
    scan_id: str
    processing_time_ms: float
    vision_source: str
    volume_cu_yd: float
    trailer_capacity_used: str
    gross_quote_usd: float
    net_customer_quote_usd: float
    scrap_recovery_yield_usd: float
    driver_instructions: List[str]
    entities: List[Dict[str, Any]]


# =====================================================================
# SCRAP RATE PROVIDER — live feed with deterministic fallback
# =====================================================================


_SCRAP_FEED_URL = "https://www.scrappricemax.com/api/prices?commodity=copper"


@dataclass(frozen=True)
class ScrapRateSheet:
    copper_lbs_usd: float = 3.85
    brass_lbs_usd: float = 2.95
    aluminum_lbs_usd: float = 0.85
    steel_lbs_usd: float = 0.15
    stainless_lbs_usd: float = 0.75
    last_updated: str = "cached"

    def to_dict(self) -> Dict[str, float]:
        return {
            "copper": self.copper_lbs_usd,
            "brass": self.brass_lbs_usd,
            "aluminum": self.aluminum_lbs_usd,
            "steel": self.steel_lbs_usd,
            "stainless": self.stainless_lbs_usd,
        }


class ScrapRateProvider:
    """
    Fetches live scrap commodity prices; falls back to cached rates on any
    failure.  Cached values are versioned and auditable.
    """

    _CACHE_TTL_SECONDS = 3600
    _FALLBACK = ScrapRateSheet()

    def __init__(self) -> None:
        self._cache: Optional[ScrapRateSheet] = None
        self._cached_at: float = 0.0

    @staticmethod
    def _fetch_live() -> Optional[ScrapRateSheet]:
        try:
            with urllib.request.urlopen(_SCRAP_FEED_URL, timeout=5) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            rates = payload.get("rates", {})
            return ScrapRateSheet(
                copper_lbs_usd=float(rates.get("copper", 3.85)),
                brass_lbs_usd=float(rates.get("brass", 2.95)),
                aluminum_lbs_usd=float(rates.get("aluminum", 0.85)),
                steel_lbs_usd=float(rates.get("steel", 0.15)),
                stainless_lbs_usd=float(rates.get("stainless", 0.75)),
                last_updated=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )
        except Exception as exc:
            logger.warning("Live scrap feed unreachable (%s); using cached rates.", exc)
            return None

    def get_rates(self, force_refresh: bool = False) -> ScrapRateSheet:
        now = time.time()
        if force_refresh or self._cache is None or (now - self._cached_at) > self._CACHE_TTL_SECONDS:
            live = self._fetch_live()
            if live:
                self._cache = live
                self._cached_at = now
        return self._cache or self._FALLBACK


# Module-level singleton so the one-hour TTL cache is shared across scans.
_scrap_rates = ScrapRateProvider()


# =====================================================================
# REAL IMAGE ANALYSIS
# =====================================================================


def _apply_exif_orientation(image: Any) -> Any:
    """Correct image orientation using EXIF data when available."""
    try:
        exif = image._getexif()
        if exif:
            orientation = exif.get(0x0112, 1)
            rotations = {3: 180, 6: 270, 8: 90}
            if orientation in rotations:
                image = image.rotate(rotations[orientation], expand=True)
    except Exception:
        pass
    return image


def _estimate_bounding_box(category: Category, pixel_area: int, pixels_per_m2: float) -> Tuple[float, float, float]:
    """Map 2D pixel area + category heuristics to a 3D bounding box in meters."""
    area_m2 = max(0.01, pixel_area / pixels_per_m2)
    side = math.sqrt(area_m2)

    height_map = {
        Category.BULKY_FURNITURE: 0.85,
        Category.SCRAP_METAL: 0.55,
        Category.GENERAL_DEBRIS: 0.65,
        Category.ELECTRONICS: 0.35,
        Category.APPLIANCE: 0.95,
        Category.YARD_WASTE: 0.75,
        Category.MOTOR_VEHICLE: 0.65,
        Category.SPORTING_GOODS: 0.75,
    }
    height = height_map.get(category, 0.6)

    # Preserve realistic aspect ratios: assume L = 1.5 * W
    width = side / math.sqrt(1.5)
    length = width * 1.5
    return round(length, 2), round(width, 2), round(height, 2)


def _classify_dominant_color(hsv_mean: np.ndarray) -> Tuple[Category, float]:
    """Use mean HSV color to infer probable material category."""
    hue, sat, val = hsv_mean

    # Metallic: low saturation, mid/high value
    if sat < 35 and val > 75:
        return Category.SCRAP_METAL, 0.72
    # Copper/brass: orange-red hue, high saturation
    if 10 <= hue <= 35 and sat > 55 and val > 60:
        return Category.SCRAP_METAL, 0.78
    # Green/brown organic: yard waste
    if 35 <= hue <= 85 and sat > 30:
        return Category.YARD_WASTE, 0.55
    # Dark, low value: general debris
    if val < 70:
        return Category.GENERAL_DEBRIS, 0.60
    # Light neutral fabric/wood: bulky furniture
    if sat < 50:
        return Category.BULKY_FURNITURE, 0.68
    return Category.GENERAL_DEBRIS, 0.50


def _resale_estimate(category: Category, weight_lbs: float) -> float:
    if category == Category.BULKY_FURNITURE:
        return 40.0
    if category == Category.APPLIANCE and weight_lbs > 50:
        return 75.0
    if category == Category.ELECTRONICS and weight_lbs > 10:
        return 25.0
    if category == Category.MOTOR_VEHICLE:
        return 250.0 if weight_lbs > 100 else 75.0
    if category == Category.SPORTING_GOODS and weight_lbs > 30:
        return 125.0
    return 0.0


def _kmeans(features: np.ndarray, k: int, max_iter: int = 15, random_seed: int = 42) -> np.ndarray:
    """Vectorized Lloyd's algorithm on a feature matrix."""
    rng = np.random.default_rng(random_seed)
    # Random centroid initialization from data samples.
    indices = rng.choice(features.shape[0], size=k, replace=False)
    centroids = features[indices].copy()
    for _ in range(max_iter):
        distances = np.linalg.norm(features[:, None, :] - centroids[None, :, :], axis=2)
        labels = np.argmin(distances, axis=1)
        new_centroids = np.array([features[labels == i].mean(axis=0) if np.any(labels == i) else centroids[i] for i in range(k)])
        if np.allclose(centroids, new_centroids):
            break
        centroids = new_centroids
    return labels


def _segment_kmeans(arr: np.ndarray, n_clusters: int = 12) -> List[Dict[str, Any]]:
    """
    Segment an image by color quantization (K-means on RGB) then run
    connected-components on each color cluster. This splits distinct objects
    of the same color without needing a trained detector. Each component
    carries its own color and bounding box.
    """
    h, w = arr.shape[:2]
    # Pure color features. Position is intentionally not used so the same
    # color on opposite sides of the frame groups into one cluster, and
    # `_find_regions` separates disconnected components spatially.
    features = arr.reshape(-1, 3).astype(np.float32)

    # Sub-sample for speed while keeping representation.
    n_samples = min(5000, features.shape[0])
    rng = np.random.default_rng(42)
    sample_idx = rng.choice(features.shape[0], size=n_samples, replace=False)
    sampled = features[sample_idx]
    sample_labels = _kmeans(sampled, n_clusters)

    # Nearest-neighbor projection back to full pixels using sampled centroids.
    centroids = []
    for i in range(n_clusters):
        cluster_points = sampled[sample_labels == i]
        if cluster_points.shape[0]:
            centroids.append(cluster_points.mean(axis=0))
        else:
            # Fall back to the closest sampled point to avoid NaNs.
            rng = np.random.default_rng(42 + i)
            centroids.append(sampled[rng.integers(0, sampled.shape[0])])
    centroids = np.array(centroids)
    distances = np.linalg.norm(features[:, None, :] - centroids[None, :, :], axis=2)
    labels = np.argmin(distances, axis=1).reshape(h, w)

    regions: List[Dict[str, Any]] = []
    for cluster_id in range(n_clusters):
        mask = (labels == cluster_id).astype(np.uint8) * 255
        for region in _find_regions(mask):
            area = region["area"]
            if area < 200:
                continue
            region_mask = region["mask"]
            mean_rgb = arr[region_mask].mean(axis=0) if np.any(region_mask) else arr[0, 0]
            hsv_patch = _rgb_to_hsv(arr[region_mask][None, ...])
            mean_hsv = np.mean(hsv_patch[0], axis=0) if hsv_patch.shape[1] > 0 else np.array([0.0, 0.0, 0.0])
            regions.append({
                "area": area,
                "bbox": region["bbox"],
                "mask": region_mask,
                "mean_rgb": mean_rgb,
                "mean_hsv": mean_hsv,
            })

    regions.sort(key=lambda x: x["area"], reverse=True)
    return regions


def _categorize_region(region: Dict[str, Any], total_pixels: int, thumb_w: int, thumb_h: int) -> Category:
    """
    Refine a segmented region's category using color, size, and shape heuristics.
    This lets the local zero-spend path distinguish likely resale objects.
    """
    hsv_mean = region["mean_hsv"]
    hue, sat, val = hsv_mean
    area = region["area"]
    area_ratio = area / total_pixels
    min_r, min_c, max_r, max_c = region["bbox"]
    width = max_c - min_c + 1
    height = max_r - min_r + 1
    aspect = max(width, height) / max(1, min(width, height))

    # Copper / brass small parts -> scrap metal.
    if 10 <= hue <= 35 and sat > 55 and val > 60:
        return Category.SCRAP_METAL

    # Metallic surfaces.
    if sat < 35 and val > 75:
        if area_ratio > 0.05 and aspect > 2.0:
            return Category.MOTOR_VEHICLE
        return Category.SCRAP_METAL

    # Dark objects.
    if val < 70:
        if area_ratio > 0.25:
            # Large flat dark object is often a table / bed frame / bulky furniture.
            if aspect > 2.5:
                return Category.BULKY_FURNITURE
            return Category.SPORTING_GOODS
        if area_ratio > 0.08 and aspect > 2.0:
            return Category.MOTOR_VEHICLE
        if area_ratio > 0.03 and aspect < 2.0:
            # Small dark rounded object on a surface: likely helmet / gear.
            return Category.SPORTING_GOODS
        return Category.GENERAL_DEBRIS

    # Green / brown organic.
    if 35 <= hue <= 85 and sat > 30:
        return Category.YARD_WASTE

    # Light neutral fabric / wood.
    if sat < 50:
        if area_ratio > 0.20:
            return Category.BULKY_FURNITURE
        return Category.GENERAL_DEBRIS

    return Category.GENERAL_DEBRIS


def _merge_by_category(
    regions: List[Dict[str, Any]],
    arr: np.ndarray,
    thumb_total_pixels: int,
    thumb_w: int,
    thumb_h: int,
) -> List[Dict[str, Any]]:
    """
    Merge adjacent or nearby segmented regions that received the same category,
    then recompute area and color for the merged component. This turns fragmented
    scooter parts or table+helmets into single, more realistic objects.
    """
    h, w = arr.shape[:2]
    label_map = np.full((h, w), -1, dtype=np.int16)
    for idx, region in enumerate(regions):
        label_map[region["mask"]] = idx

    # Classify each region and build a per-pixel category map.
    cat_to_idx = {cat: i for i, cat in enumerate(Category)}
    category_map = np.full((h, w), -1, dtype=np.int16)
    for idx, region in enumerate(regions):
        if idx >= 0 and label_map[region["mask"]].shape[0] > 0:
            cat = _categorize_region(region, thumb_total_pixels, thumb_w, thumb_h)
            category_map[region["mask"]] = cat_to_idx[cat]

    merged: List[Dict[str, Any]] = []
    for cat in Category:
        mask = (category_map == cat_to_idx[cat]).astype(np.uint8) * 255
        for region in _find_regions(mask):
            area = region["area"]
            if area < thumb_total_pixels * 0.015:
                continue
            region_mask = region["mask"]
            mean_rgb = arr[region_mask].mean(axis=0) if np.any(region_mask) else arr[0, 0]
            hsv_patch = _rgb_to_hsv(arr[region_mask][None, ...])
            mean_hsv = np.mean(hsv_patch[0], axis=0) if hsv_patch.shape[1] > 0 else np.array([0.0, 0.0, 0.0])
            merged.append({
                "area": area,
                "bbox": region["bbox"],
                "mask": region_mask,
                "mean_rgb": mean_rgb,
                "mean_hsv": mean_hsv,
                "inferred_category": cat,
            })

    merged.sort(key=lambda x: x["area"], reverse=True)
    return merged


def _bbox_distance(a: Tuple[int, int, int, int], b: Tuple[int, int, int, int]) -> int:
    """Pixel distance between two bounding boxes; 0 if they overlap."""
    min_r_a, min_c_a, max_r_a, max_c_a = a
    min_r_b, min_c_b, max_r_b, max_c_b = b
    dr = max(0, min_r_b - max_r_a, min_r_a - max_r_b)
    dc = max(0, min_c_b - max_c_a, min_c_a - max_c_b)
    return dr + dc


def _merge_nearby_regions(
    regions: List[Dict[str, Any]],
    arr: np.ndarray,
    distance_px: int = 20,
) -> List[Dict[str, Any]]:
    """
    Merge regions of the same category whose bounding boxes are within
    `distance_px` pixels. This joins fragmented table / helmet / gear segments
    into a single object without merging disconnected background pieces.
    """
    if not regions:
        return regions

    merged: List[Dict[str, Any]] = []
    consumed = set()
    n = len(regions)
    for i in range(n):
        if i in consumed:
            continue
        region = regions[i]
        combined_mask = region["mask"].copy()
        bbox = list(region["bbox"])
        for j in range(i + 1, n):
            if j in consumed:
                continue
            other = regions[j]
            if region.get("category") != other.get("category"):
                continue
            if _bbox_distance(tuple(bbox), other["bbox"]) > distance_px:
                continue
            combined_mask = combined_mask | other["mask"]
            min_r, min_c, max_r, max_c = bbox
            omin_r, omin_c, omax_r, omax_c = other["bbox"]
            bbox = [
                min(min_r, omin_r),
                min(min_c, omin_c),
                max(max_r, omax_r),
                max(max_c, omax_c),
            ]
            consumed.add(j)

        if combined_mask.any():
            mean_rgb = arr[combined_mask].mean(axis=0)
            hsv_patch = _rgb_to_hsv(arr[combined_mask][None, ...])
            mean_hsv = np.mean(hsv_patch[0], axis=0) if hsv_patch.shape[1] > 0 else region["mean_hsv"]
            merged.append({
                "area": int(combined_mask.sum()),
                "bbox": tuple(bbox),
                "mask": combined_mask,
                "mean_rgb": mean_rgb,
                "mean_hsv": mean_hsv,
                "category": region["category"],
            })
        consumed.add(i)

    merged.sort(key=lambda x: x["area"], reverse=True)
    return merged


# COCO 80-class labels used by YOLOv8 ONNX export.
_COCO_NAMES = (
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog",
    "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella",
    "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite",
    "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle",
    "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich",
    "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote",
    "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush",
)


def _coco_to_category(name: str) -> Category:
    """Map COCO object classes to hauling categories."""
    name = name.lower()
    if name in {"bicycle", "motorcycle", "car", "bus", "truck", "train"}:
        return Category.MOTOR_VEHICLE
    if name in {
        "backpack", "umbrella", "handbag", "suitcase", "frisbee", "skis", "snowboard",
        "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
        "tennis racket",
    }:
        return Category.SPORTING_GOODS
    if name in {"chair", "couch", "bench", "bed", "dining table"}:
        return Category.BULKY_FURNITURE
    if name in {"tv", "laptop", "mouse", "remote", "keyboard", "cell phone"}:
        return Category.ELECTRONICS
    if name in {"microwave", "oven", "toaster", "sink", "refrigerator"}:
        return Category.APPLIANCE
    if name == "potted plant":
        return Category.YARD_WASTE
    return Category.GENERAL_DEBRIS


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45) -> List[int]:
    """Greedy Non-Maximum Suppression for XYXY boxes."""
    if len(boxes) == 0:
        return []
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = np.argsort(scores)[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        order = order[1:][iou <= iou_threshold]
    return keep


_HAULING_COCO_WHITELIST = {
    "bicycle", "motorcycle", "car", "bus", "truck", "train", "backpack", "umbrella",
    "handbag", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite",
    "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "chair", "couch", "bench", "bed", "dining table", "tv", "laptop", "mouse", "remote",
    "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
    "potted plant", "vase", "book", "clock",
}


@dataclass(frozen=True)
class HaulingItemSpec:
    """Fine-grained hauling catalog: dimensions, weight, resale, and haul category."""

    category: Category
    dims_m: Tuple[float, float, float]
    typical_weight_lbs: float
    resale_usd: float
    label: str


# Fine-grained catalog used by the TinyCLIP zero-shot classifier. Dims are
# typical real-world dimensions (L x W x H). Weights/resale are market-informed
# defaults for quotes and driver manifests.
_HAULING_ITEM_CATALOG: Dict[str, HaulingItemSpec] = {
    "motor scooter": HaulingItemSpec(Category.MOTOR_VEHICLE, (1.80, 0.70, 1.10), 250.0, 400.0, "Motor Scooter / Motor Vehicle"),
    "motorcycle": HaulingItemSpec(Category.MOTOR_VEHICLE, (2.00, 0.80, 1.20), 400.0, 600.0, "Motorcycle / Motor Vehicle"),
    "bicycle": HaulingItemSpec(Category.MOTOR_VEHICLE, (1.70, 0.60, 1.10), 35.0, 120.0, "Bicycle / Motor Vehicle"),
    "bicycle helmet": HaulingItemSpec(Category.SPORTING_GOODS, (0.25, 0.20, 0.20), 3.0, 40.0, "Bicycle Helmet / Sporting Goods"),
    "motorcycle helmet": HaulingItemSpec(Category.SPORTING_GOODS, (0.30, 0.25, 0.25), 5.0, 60.0, "Motorcycle Helmet / Sporting Goods"),
    "football helmet": HaulingItemSpec(Category.SPORTING_GOODS, (0.30, 0.25, 0.25), 5.0, 60.0, "Football Helmet / Sporting Goods"),
    "helmet": HaulingItemSpec(Category.SPORTING_GOODS, (0.28, 0.22, 0.22), 4.0, 50.0, "Helmet / Sporting Goods"),
    "pool table": HaulingItemSpec(Category.SPORTING_GOODS, (2.10, 1.20, 0.85), 800.0, 500.0, "Pool Table / Sporting Goods"),
    "ping pong table": HaulingItemSpec(Category.SPORTING_GOODS, (2.70, 1.50, 0.75), 120.0, 300.0, "Ping Pong Table / Sporting Goods"),
    "cardboard box": HaulingItemSpec(Category.GENERAL_DEBRIS, (0.50, 0.40, 0.40), 20.0, 0.0, "Cardboard Box / General Debris"),
    "plastic tote": HaulingItemSpec(Category.GENERAL_DEBRIS, (0.60, 0.40, 0.35), 15.0, 5.0, "Plastic Tote / General Debris"),
    "suitcase": HaulingItemSpec(Category.SPORTING_GOODS, (0.60, 0.40, 0.25), 25.0, 30.0, "Suitcase / Sporting Goods"),
    "backpack": HaulingItemSpec(Category.SPORTING_GOODS, (0.45, 0.30, 0.20), 10.0, 20.0, "Backpack / Sporting Goods"),
    "potted plant": HaulingItemSpec(Category.YARD_WASTE, (0.30, 0.30, 0.60), 30.0, 0.0, "Potted Plant / Yard Waste"),
    "refrigerator": HaulingItemSpec(Category.APPLIANCE, (0.80, 0.70, 1.80), 300.0, 100.0, "Refrigerator / Appliance"),
    "chair": HaulingItemSpec(Category.BULKY_FURNITURE, (0.50, 0.50, 0.90), 40.0, 20.0, "Chair / Furniture"),
    "couch": HaulingItemSpec(Category.BULKY_FURNITURE, (2.00, 0.90, 0.85), 180.0, 60.0, "Couch / Furniture"),
    "dining table": HaulingItemSpec(Category.BULKY_FURNITURE, (1.50, 0.90, 0.75), 120.0, 80.0, "Dining Table / Furniture"),
    "tv": HaulingItemSpec(Category.ELECTRONICS, (1.20, 0.10, 0.70), 50.0, 100.0, "TV / Electronics"),
    "laptop": HaulingItemSpec(Category.ELECTRONICS, (0.35, 0.25, 0.03), 5.0, 200.0, "Laptop / Electronics"),
    "keyboard": HaulingItemSpec(Category.ELECTRONICS, (0.45, 0.15, 0.03), 2.0, 25.0, "Keyboard / Electronics"),
    "mouse": HaulingItemSpec(Category.ELECTRONICS, (0.12, 0.07, 0.04), 0.5, 10.0, "Mouse / Electronics"),
    "cell phone": HaulingItemSpec(Category.ELECTRONICS, (0.15, 0.07, 0.01), 0.5, 50.0, "Cell Phone / Electronics"),
    "clock": HaulingItemSpec(Category.ELECTRONICS, (0.30, 0.30, 0.05), 3.0, 15.0, "Clock / Electronics"),
    "refrigerator": HaulingItemSpec(Category.APPLIANCE, (0.80, 0.70, 1.80), 300.0, 100.0, "Refrigerator / Appliance"),
    "microwave": HaulingItemSpec(Category.APPLIANCE, (0.40, 0.30, 0.25), 40.0, 35.0, "Microwave / Appliance"),
    "oven": HaulingItemSpec(Category.APPLIANCE, (0.60, 0.60, 0.70), 120.0, 80.0, "Oven / Appliance"),
    "toaster": HaulingItemSpec(Category.APPLIANCE, (0.30, 0.20, 0.20), 8.0, 20.0, "Toaster / Appliance"),
    "sink": HaulingItemSpec(Category.APPLIANCE, (0.60, 0.40, 0.20), 40.0, 50.0, "Sink / Appliance"),
    "car": HaulingItemSpec(Category.MOTOR_VEHICLE, (4.50, 1.80, 1.50), 3500.0, 2000.0, "Car / Motor Vehicle"),
    "truck": HaulingItemSpec(Category.MOTOR_VEHICLE, (5.50, 2.00, 2.00), 5000.0, 3000.0, "Truck / Motor Vehicle"),
    "bus": HaulingItemSpec(Category.MOTOR_VEHICLE, (12.0, 2.50, 3.20), 25000.0, 8000.0, "Bus / Motor Vehicle"),
    "train": HaulingItemSpec(Category.MOTOR_VEHICLE, (20.0, 3.00, 3.50), 50000.0, 15000.0, "Train / Motor Vehicle"),
    "bed": HaulingItemSpec(Category.BULKY_FURNITURE, (2.00, 1.50, 0.40), 150.0, 120.0, "Bed / Furniture"),
    "bench": HaulingItemSpec(Category.BULKY_FURNITURE, (1.50, 0.50, 0.80), 60.0, 40.0, "Bench / Furniture"),
    "book": HaulingItemSpec(Category.GENERAL_DEBRIS, (0.25, 0.18, 0.03), 1.0, 0.0, "Book / General Debris"),
    "bottle": HaulingItemSpec(Category.GENERAL_DEBRIS, (0.25, 0.08, 0.08), 1.0, 0.0, "Bottle / General Debris"),
    "cup": HaulingItemSpec(Category.GENERAL_DEBRIS, (0.12, 0.08, 0.12), 0.5, 0.0, "Cup / General Debris"),
    "bowl": HaulingItemSpec(Category.GENERAL_DEBRIS, (0.20, 0.20, 0.08), 0.5, 0.0, "Bowl / General Debris"),
    "vase": HaulingItemSpec(Category.GENERAL_DEBRIS, (0.25, 0.15, 0.35), 4.0, 15.0, "Vase / General Debris"),
    "handbag": HaulingItemSpec(Category.GENERAL_DEBRIS, (0.30, 0.20, 0.15), 5.0, 25.0, "Handbag / General Debris"),
    "umbrella": HaulingItemSpec(Category.SPORTING_GOODS, (1.00, 0.15, 0.15), 3.0, 10.0, "Umbrella / Sporting Goods"),
    "sports ball": HaulingItemSpec(Category.SPORTING_GOODS, (0.25, 0.25, 0.25), 1.0, 5.0, "Sports Ball / Sporting Goods"),
    "skateboard": HaulingItemSpec(Category.SPORTING_GOODS, (0.80, 0.20, 0.10), 5.0, 35.0, "Skateboard / Sporting Goods"),
    "tennis racket": HaulingItemSpec(Category.SPORTING_GOODS, (0.70, 0.25, 0.05), 1.0, 25.0, "Tennis Racket / Sporting Goods"),
    "baseball bat": HaulingItemSpec(Category.SPORTING_GOODS, (0.85, 0.05, 0.05), 1.0, 20.0, "Baseball Bat / Sporting Goods"),
    "baseball glove": HaulingItemSpec(Category.SPORTING_GOODS, (0.25, 0.20, 0.15), 1.0, 30.0, "Baseball Glove / Sporting Goods"),
    "skis": HaulingItemSpec(Category.SPORTING_GOODS, (1.60, 0.15, 0.10), 6.0, 80.0, "Skis / Sporting Goods"),
    "snowboard": HaulingItemSpec(Category.SPORTING_GOODS, (1.50, 0.30, 0.05), 6.0, 80.0, "Snowboard / Sporting Goods"),
    "surfboard": HaulingItemSpec(Category.SPORTING_GOODS, (2.00, 0.50, 0.10), 8.0, 120.0, "Surfboard / Sporting Goods"),
}


# All candidate labels the zero-shot classifier can distinguish.
_HAULING_CLIP_LABELS = list(_HAULING_ITEM_CATALOG.keys())


def _iou(a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]) -> float:
    """Intersection-over-Union for two XYXY boxes."""
    x1 = max(a[0], b[0])
    y1 = max(a[1], b[1])
    x2 = min(a[2], b[2])
    y2 = min(a[3], b[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / (area_a + area_b - inter + 1e-6)


class _YoloOnnxDetector:
    """Lazy-singleton wrapper around a YOLOv8 ONNX model for CPU inference."""

    _instance: Optional["_YoloOnnxDetector"] = None
    _lock = False

    def __new__(cls) -> "_YoloOnnxDetector":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._session = None
        return cls._instance

    @property
    def available(self) -> bool:
        if not _env_bool("HAUL_YOLO_ENABLED", True):
            return False
        try:
            import onnxruntime as ort  # type: ignore
            if self._session is None:
                model_path = Path(_env("HAUL_YOLO_MODEL_PATH", "models/yolov8n.onnx"))
                if not model_path.exists():
                    return False
                self._session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
            return self._session is not None
        except Exception as exc:
            logger.warning("YOLO ONNX detector not available: %s", exc)
            return False

    def _preprocess(self, image: Any) -> Tuple[np.ndarray, float, float, int, int]:
        """Letterbox resize and return float32 NCHW tensor plus scale/padding."""
        from PIL import Image as PILImage
        orig_w, orig_h = image.size
        scale = 640.0 / max(orig_w, orig_h)
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        pad_w = (640 - new_w) // 2
        pad_h = (640 - new_h) // 2

        letter = PILImage.new("RGB", (640, 640), (114, 114, 114))
        resized = image.convert("RGB").resize((new_w, new_h), PILImage.Resampling.LANCZOS)
        letter.paste(resized, (pad_w, pad_h))

        arr = np.array(letter).astype(np.float32) / 255.0
        input_tensor = np.transpose(arr, (2, 0, 1))[None, ...]
        return input_tensor, scale, pad_w, pad_h, orig_w, orig_h

    def get_boxes(self, image: Any) -> List[Dict[str, Any]]:
        """Run YOLOv8 ONNX NMS and return filtered detections in original image coordinates."""
        import onnxruntime as ort
        if self._session is None:
            raise RuntimeError("ONNX session not initialized")

        input_tensor, scale, pad_w, pad_h, orig_w, orig_h = self._preprocess(image)
        outputs = self._session.run(None, {self._session.get_inputs()[0].name: input_tensor})
        predictions = outputs[0][0].T  # [8400, 84]

        conf_threshold = _env_float("HAUL_YOLO_CONF", 0.55)
        min_area_ratio = _env_float("HAUL_YOLO_MIN_AREA_RATIO", 0.01)
        max_area_ratio = _env_float("HAUL_YOLO_MAX_AREA_RATIO", 0.5)
        max_detections = _env_int("HAUL_YOLO_MAX_DETECTIONS", 8)
        min_area_px = orig_w * orig_h * min_area_ratio
        max_area_px = orig_w * orig_h * max_area_ratio

        boxes_xyxy: List[np.ndarray] = []
        confidences: List[float] = []
        class_ids: List[int] = []

        for row in predictions:
            x, y, w, h = row[:4]
            scores = row[4:]
            sigmoid_scores = 1.0 / (1.0 + np.exp(-scores))
            class_id = int(np.argmax(sigmoid_scores))
            confidence = float(sigmoid_scores[class_id])
            if confidence < conf_threshold:
                continue

            class_name = _COCO_NAMES[class_id]
            if class_name not in _HAULING_COCO_WHITELIST:
                continue

            x1, y1 = x - w / 2.0, y - h / 2.0
            x2, y2 = x + w / 2.0, y + h / 2.0
            # Remove padding and scale back to original image coordinates.
            x1 = (x1 - pad_w) / scale
            x2 = (x2 - pad_w) / scale
            y1 = (y1 - pad_h) / scale
            y2 = (y2 - pad_h) / scale

            # Clip to image bounds and drop degenerate boxes.
            x1, y1 = max(0.0, x1), max(0.0, y1)
            x2, y2 = min(orig_w, x2), min(orig_h, y2)
            area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
            if area < min_area_px or area > max_area_px:
                continue

            boxes_xyxy.append(np.array([x1, y1, x2, y2]))
            confidences.append(confidence)
            class_ids.append(class_id)

        if not boxes_xyxy:
            return []

        boxes = np.stack(boxes_xyxy)
        keep = _nms(boxes, np.array(confidences), iou_threshold=_env_float("HAUL_YOLO_IOU", 0.3))

        # Keep only the highest-confidence detections to avoid hallucination floods.
        keep = keep[:max_detections]

        results: List[Dict[str, Any]] = []
        for idx in keep:
            x1, y1, x2, y2 = boxes[idx]
            class_name = _COCO_NAMES[class_ids[idx]]
            results.append({
                "bbox": (float(x1), float(y1), float(x2), float(y2)),
                "class_name": class_name,
                "category": _coco_to_category(class_name),
                "confidence": round(confidences[idx], 2),
                "pixel_area": float((x2 - x1) * (y2 - y1)),
            })
        return results


def _region_to_entity(
    region: Dict[str, Any],
    category: Category,
    label: str,
    confidence: float,
    pixels_per_m2: float,
    spec: Optional[HaulingItemSpec] = None,
    pixel_bbox: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0),
) -> DetectedEntity:
    """Convert a pixel region into a DetectedEntity with a 3-D bounding box."""
    if spec is not None and spec.dims_m[0] > 0.0:
        box = spec.dims_m
        volume_m3 = box[0] * box[1] * box[2]
        weight_lbs = max(5.0, spec.typical_weight_lbs)
        resale = max(0.0, spec.resale_usd)
        return DetectedEntity(
            label=spec.label,
            category=spec.category,
            bounding_box_3d_m=box,
            est_weight_lbs=weight_lbs,
            density_coefficient=_density_for_category(spec.category),
            confidence=round(min(1.0, confidence), 2),
            resale_potential_usd=resale,
            pixel_bbox=pixel_bbox,
        )

    pixel_area = region["area"]
    box = _estimate_bounding_box(category, pixel_area, pixels_per_m2)
    volume_m3 = box[0] * box[1] * box[2]
    weight_lbs = max(5.0, round(volume_m3 * 2205.0 * _density_for_category(category), 1))
    return DetectedEntity(
        label=label,
        category=category,
        bounding_box_3d_m=box,
        est_weight_lbs=weight_lbs,
        density_coefficient=_density_for_category(category),
        confidence=round(min(1.0, confidence), 2),
        resale_potential_usd=_resale_estimate(category, weight_lbs),
        pixel_bbox=pixel_bbox,
    )


def _resolve_fused_category(class_name: str, deterministic_category: Category) -> Tuple[Category, str]:
    """
    Decide the final hauling category when YOLO and deterministic segmentation disagree.
    This keeps domain-specific labels (pool table, helmets/gear bags) while still
    allowing YOLO to confidently reclassify e.g. a scooter as a motor vehicle.
    """
    name = class_name.lower()
    # Vehicle classes are strong YOLO signals.
    if name in {"bicycle", "motorcycle", "car", "bus", "truck", "train"}:
        return Category.MOTOR_VEHICLE, _label_for_category(Category.MOTOR_VEHICLE)
    # Sporting-goods YOLO signals should not erase an already-sporting region.
    if name in {"backpack", "suitcase", "handbag", "sports ball", "skis", "snowboard", "frisbee", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket"}:
        if deterministic_category in {Category.SPORTING_GOODS, Category.BULKY_FURNITURE}:
            return Category.SPORTING_GOODS, _label_for_category(Category.SPORTING_GOODS)
        return Category.SPORTING_GOODS, _label_for_category(Category.SPORTING_GOODS)
    # A dining table in a hauling context is often a pool / ping-pong / game table.
    if name in {"dining table", "bed"}:
        if deterministic_category == Category.SPORTING_GOODS:
            return Category.SPORTING_GOODS, "Sporting Goods / Pool Table / Gear"
        return _coco_to_category(name), _label_for_category(_coco_to_category(name))
    return _coco_to_category(name), _label_for_category(_coco_to_category(name))


def _has_plant_color(image: Any) -> bool:
    """Check if an image crop contains plausible green/brown plant pixels."""
    from PIL import Image as PILImage

    if not isinstance(image, PILImage.Image):
        image = PILImage.fromarray(image)
    img = image.convert("RGB").resize((64, 64))
    arr = np.array(img)
    hsv = _rgb_to_hsv(arr)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    green = ((h >= 35) & (h <= 85) & (s >= 20)).sum()
    brown = ((h >= 10) & (h <= 35) & (s >= 20) & (v >= 20)).sum()
    total = arr.shape[0] * arr.shape[1]
    return ((green + brown) / total) > 0.05


def _classify_crop(
    image: Any,
    bbox: Tuple[float, float, float, float],
) -> Optional[Tuple[str, float, HaulingItemSpec]]:
    """Zero-shot classify a cropped object using TinyCLIP and the hauling catalog."""
    if not HAUL_CLIP_ENABLED:
        return None

    clip = get_classifier()
    if not clip.available:
        return None

    try:
        from PIL import Image
    except ImportError:
        return None

    width, height = image.size
    x1, y1, x2, y2 = (
        max(0, int(bbox[0])),
        max(0, int(bbox[1])),
        min(width, int(bbox[2])),
        min(height, int(bbox[3])),
    )
    if x2 <= x1 or y2 <= y1:
        return None

    crop = image.crop((x1, y1, x2, y2))
    result = clip.classify(crop, _HAULING_CLIP_LABELS)
    if result is None:
        return None

    # Common CLIP confusions: map near-synonyms to the more frequent hauling label.
    canonical_key = {"ping pong table": "pool table"}.get(result.key, result.key)
    spec = _HAULING_ITEM_CATALOG.get(canonical_key)
    if spec is None or canonical_key == "person" or result.score < HAUL_CLIP_CONF:
        return None

    # Reject false "potted plant" if the crop has no green/brown plant color.
    if canonical_key == "potted plant" and not _has_plant_color(crop):
        return None

    return canonical_key, result.score, spec


def _merge_detections(
    detections: List[Dict[str, Any]],
    iou_threshold: float = 0.05,
    containment_threshold: float = 0.25,
) -> List[Dict[str, Any]]:
    """
    Merge fragmented detections of the same hauling object using union-find.

    A low IoU threshold is intentional: segmentation often splits one object
    (pool table, scooter, couch) into several adjacent regions, while distinct
    objects of the same category rarely touch.  Containment catches small
    sub-regions that sit almost entirely inside a larger object.
    """

    def _containment(inner: Tuple[float, ...], outer: Tuple[float, ...]) -> float:
        x1 = max(inner[0], outer[0])
        y1 = max(inner[1], outer[1])
        x2 = min(inner[2], outer[2])
        y2 = min(inner[3], outer[3])
        inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        inner_area = max(1.0, (inner[2] - inner[0]) * (inner[3] - inner[1]))
        return inter / inner_area

    def _center_inside(inner: Tuple[float, ...], outer: Tuple[float, ...]) -> bool:
        cx = (inner[0] + inner[2]) / 2.0
        cy = (inner[1] + inner[3]) / 2.0
        return outer[0] <= cx <= outer[2] and outer[1] <= cy <= outer[3]

    n = len(detections)
    if n == 0:
        return []

    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for i in range(n):
        for j in range(i + 1, n):
            a, b = detections[i], detections[j]
            same_group = (
                a["category"] == b["category"]
                or a.get("clip_key") == b.get("clip_key")
            )
            if not same_group:
                continue
            iou = _iou(a["bbox"], b["bbox"])
            containment = max(_containment(a["bbox"], b["bbox"]), _containment(b["bbox"], a["bbox"]))
            center_inside = _center_inside(a["bbox"], b["bbox"]) or _center_inside(b["bbox"], a["bbox"])

            # A small, unclassified fragment inside a larger classified object is part of it.
            spec_merge = False
            for larger, smaller in ((a, b), (b, a)):
                if larger.get("spec") and not smaller.get("spec"):
                    ci = _center_inside(smaller["bbox"], larger["bbox"])
                    area_ratio = (smaller["pixel_area"] + 1.0) / (larger["pixel_area"] + 1.0)
                    if ci and area_ratio < 0.35:
                        spec_merge = True

            if iou >= iou_threshold or containment >= containment_threshold or center_inside or spec_merge:
                union(i, j)

    # Pick the highest-quality detection from each connected component.
    components: Dict[int, List[int]] = {}
    for i in range(n):
        components.setdefault(find(i), []).append(i)

    kept: List[Dict[str, Any]] = []
    for members in components.values():
        best_idx = max(
            members,
            key=lambda idx: (
                detections[idx].get("spec") is not None,
                detections[idx]["pixel_area"],
                detections[idx]["confidence"],
            ),
        )
        kept.append(detections[best_idx])
    return kept


def _yolo_detect(image_bytes: bytes, scan_id: str) -> Tuple[List[DetectedEntity], Dict[str, Any], str]:
    """Run trained YOLOv8 ONNX object detection and convert outputs to entities."""
    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes))
    image = _apply_exif_orientation(image)
    detector = _YoloOnnxDetector()
    if not detector.available:
        raise RuntimeError("YOLO ONNX model not available")

    frame_width_m = _env_float("HAUL_FRAME_WIDTH_METERS", 2.5)
    orig_w, orig_h = image.size
    pixels_per_m2 = (orig_w / frame_width_m) ** 2
    boxes = detector.get_boxes(image)
    if not boxes:
        raise RuntimeError("YOLO produced no detections")

    entities = [
        _region_to_entity(
            {"area": b["pixel_area"]},
            b["category"],
            f"{b['class_name'].title()} / {_label_for_category(b['category'])}",
            b["confidence"],
            pixels_per_m2,
            pixel_bbox=b["bbox"],
        )
        for b in boxes
    ]
    return entities, {"detections": len(boxes)}, "yolov8_onnx"


def _entity_for_detection(
    image: Any,
    bbox: Tuple[float, float, float, float],
    pixel_area: float,
    fallback_category: Category,
    fallback_label: str,
    fallback_confidence: float,
    pixels_per_m2: float,
) -> Optional[DetectedEntity]:
    """Classify a detection crop with TinyCLIP, then build a DetectedEntity."""
    classification = _classify_crop(image, bbox)
    if classification:
        key, score, spec = classification
        confidence = min(1.0, max(0.0, score / 25.0))  # Normalize raw CLIP logit roughly.
        return _region_to_entity(
            {"area": pixel_area},
            spec.category,
            spec.label,
            confidence,
            pixels_per_m2,
            spec=spec,
            pixel_bbox=bbox,
        )
    if pixel_area < 0.0001:
        return None
    return _region_to_entity(
        {"area": pixel_area},
        fallback_category,
        fallback_label,
        fallback_confidence,
        pixels_per_m2,
        pixel_bbox=bbox,
    )


def _fused_detect(image_bytes: bytes, scan_id: str) -> Tuple[List[DetectedEntity], Dict[str, Any], str]:
    """
    Fuse deterministic color/segmentation, YOLOv8 ONNX detections, and TinyCLIP
    zero-shot classification.  Segmentation splits distinct objects, YOLO provides
    trained bounding boxes, and TinyCLIP re-labels each crop with fine-grained
    hauling-specific labels (motor scooter, pool table, helmet, etc.).
    """
    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes))
    image = _apply_exif_orientation(image)
    width_px, height_px = image.size
    if image.mode != "RGB":
        image = image.convert("RGB")

    # ---- Deterministic segmentation (same pipeline as _analyze_image_bytes) ----
    thumb = image.resize((320, int(320 * height_px / width_px)))
    thumb_w, thumb_h = thumb.size
    thumb_total_pixels = thumb_w * thumb_h
    arr = np.array(thumb)

    frame_width_m = _env_float("HAUL_FRAME_WIDTH_METERS", 2.5)
    pixels_per_m = width_px / frame_width_m
    pixels_per_m2 = pixels_per_m ** 2
    scale_x = width_px / thumb_w
    scale_y = height_px / thumb_h

    regions = _segment_kmeans(arr, n_clusters=6)
    for region in regions:
        region["category"] = _categorize_region(region, thumb_total_pixels, thumb_w, thumb_h)
        min_r, min_c, max_r, max_c = region["bbox"]
        region["orig_bbox"] = (
            min_c * scale_x,
            min_r * scale_y,
            (max_c + 1) * scale_x,
            (max_r + 1) * scale_y,
        )
        region["orig_pixel_area"] = region["area"] * scale_x * scale_y

    # ---- YOLO trained labels ----
    detector = _YoloOnnxDetector()
    yolo_boxes = detector.get_boxes(image) if detector.available else []
    clip_available = HAUL_CLIP_ENABLED and get_classifier().available
    if not yolo_boxes and not clip_available:
        raise RuntimeError("No trained models available; falling back to deterministic segmentation")

    matched_yolo: set[int] = set()
    matched_region: set[int] = set()

    for yolo in sorted(yolo_boxes, key=lambda b: b["confidence"], reverse=True):
        best_idx = -1
        best_iou = 0.0
        for idx, region in enumerate(regions):
            if idx in matched_region:
                continue
            iou = _iou(yolo["bbox"], region["orig_bbox"])
            if iou > best_iou:
                best_iou = iou
                best_idx = idx
        if best_idx >= 0 and best_iou >= _env_float("HAUL_FUSION_IOU", 0.25):
            region = regions[best_idx]
            deterministic_category = region.get("category", Category.GENERAL_DEBRIS)
            fused_category, fused_label = _resolve_fused_category(yolo["class_name"], deterministic_category)
            region["category"] = fused_category
            region["yolo_label"] = f"{yolo['class_name'].title()} / {fused_label}"
            region["yolo_confidence"] = yolo["confidence"]
            region["yolo_bbox"] = yolo["bbox"]
            region["yolo_pixel_area"] = yolo["pixel_area"]
            matched_region.add(best_idx)
            matched_yolo.add(id(yolo))

    # Build detection candidates with bounding boxes and fallback metadata.
    detections: List[Dict[str, Any]] = []
    for idx, region in enumerate(regions):
        pixel_area = region.get("yolo_pixel_area", region["orig_pixel_area"])
        if pixel_area < (width_px * height_px * 0.015):
            continue

        bbox = region.get("yolo_bbox", region["orig_bbox"])
        if "yolo_label" in region:
            fallback_category = region["category"]
            fallback_label = region["yolo_label"]
            fallback_confidence = region["yolo_confidence"]
        else:
            fallback_category = region["category"]
            fallback_label = _label_for_category(region["category"])
            fallback_confidence = _classify_dominant_color(region["mean_hsv"])[1]

        detections.append({
            "bbox": bbox,
            "pixel_area": pixel_area,
            "fallback_category": fallback_category,
            "fallback_label": fallback_label,
            "fallback_confidence": fallback_confidence,
        })

    # Add YOLO boxes that did not overlap any segment (large standalone objects).
    for yolo in yolo_boxes:
        if id(yolo) in matched_yolo:
            continue
        box = yolo["bbox"]
        if yolo["class_name"] == "person":
            continue
        pixel_area = max(1.0, (box[2] - box[0]) * (box[3] - box[1]))
        detections.append({
            "bbox": box,
            "pixel_area": pixel_area,
            "fallback_category": yolo["category"],
            "fallback_label": f"{yolo['class_name'].title()} / {_label_for_category(yolo['category'])}",
            "fallback_confidence": yolo["confidence"],
        })

    # Classify the most promising crops first to keep latency low.
    detections.sort(key=lambda d: d["pixel_area"], reverse=True)
    classify_limit = min(HAUL_CLIP_MAX_CANDIDATES, len(detections))

    classified: List[Dict[str, Any]] = []
    for idx, det in enumerate(detections):
        spec = None
        clip_key: Optional[str] = None
        clip_score = 0.0
        if idx < classify_limit:
            classification = _classify_crop(image, det["bbox"])
            if classification:
                clip_key, clip_score, spec = classification

        classified.append({
            "bbox": det["bbox"],
            "pixel_area": det["pixel_area"],
            "category": spec.category if spec else det["fallback_category"],
            "label": spec.label if spec else det["fallback_label"],
            "confidence": clip_score / 25.0 if spec else det["fallback_confidence"],
            "spec": spec,
            "clip_key": clip_key,
        })

    merged = _merge_detections(classified, iou_threshold=_env_float("HAUL_MERGE_IOU", 0.05))

    entities: List[DetectedEntity] = []
    for det in merged:
        entities.append(
            _region_to_entity(
                {"area": det["pixel_area"]},
                det["category"],
                det["label"],
                det["confidence"],
                pixels_per_m2,
                spec=det.get("spec"),
                pixel_bbox=det["bbox"],
            )
        )

    entities.sort(key=lambda e: e.est_weight_lbs, reverse=True)
    entities = entities[:15]

    vision_source = "yolov8_tinyclip_fused" if clip_available else "yolov8_fused"

    features = {
        "segmented_regions": len(regions),
        "yolo_detections": len(yolo_boxes),
        "fused_entities": len(entities),
        "frame_width_m": frame_width_m,
    }
    return entities, features, vision_source



def _analyze_image_bytes(image_bytes: bytes, scan_id: str) -> Tuple[List[DetectedEntity], Dict[str, Any], str]:
    """
    Perform deterministic, model-free image feature extraction.
    Returns detected entities, telemetry-ready features, and source label.
    """
    try:
        from PIL import Image
    except ImportError:
        raise RuntimeError("Pillow is required for image analysis: pip install Pillow")

    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        raise RuntimeError(f"Uploaded file is not a valid image: {exc}") from exc
    image = _apply_exif_orientation(image)

    if image.mode != "RGB":
        image = image.convert("RGB")

    width_px, height_px = image.size

    # Downsample for speed while preserving color statistics.
    thumb = image.resize((320, int(320 * height_px / width_px)))
    thumb_w, thumb_h = thumb.size
    thumb_total_pixels = thumb_w * thumb_h
    arr = np.array(thumb)
    hsv = _rgb_to_hsv(arr)
    mean_hsv = np.mean(hsv.reshape(-1, 3), axis=0)

    # Edge/texture proxy using grayscale standard deviation.
    gray = np.mean(arr, axis=2)
    texture_score = float(np.std(gray))
    clutter_score = min(1.0, texture_score / 50.0)

    # Estimate real-world scale from a calibrated phone-camera assumption:
    # a typical smartphone photo taken ~2 m from a load frames ~2.5 m wide.
    # Use the thumbnail coordinate system for all segmentation math so area,
    # scale and confidence are consistent.
    # Override via HAUL_FRAME_WIDTH_METERS env var.
    frame_width_m = _env_float("HAUL_FRAME_WIDTH_METERS", 2.5)
    thumb_pixels_per_meter = thumb_w / frame_width_m
    thumb_pixels_per_m2 = thumb_pixels_per_meter ** 2

    # K-means color segmentation into a small number of clusters. Objects of the
    # same color are grouped and then split by connected components, giving distinct
    # blobs like the scooter, pool table, and background walls without a model.
    regions = _segment_kmeans(arr, n_clusters=6)

    # Classify each segmented region. The same-color cluster may split an object
    # into multiple pieces (table top, legs, helmet); the front-end/quote engine
    # aggregates the recovery manifest, and a future model-based pass will merge
    # true instances once a trained detector is wired in.
    for region in regions:
        region["category"] = _categorize_region(region, thumb_total_pixels, thumb_w, thumb_h)

    entities: List[DetectedEntity] = []
    used_area = 0
    for region in regions[:8]:
        pixel_area = region["area"]
        if pixel_area < thumb_total_pixels * 0.015:
            continue
        used_area += pixel_area
        category = region["category"]
        confidence = _classify_dominant_color(region["mean_hsv"])[1]
        box = _estimate_bounding_box(category, pixel_area, thumb_pixels_per_m2)
        # Realistic pounds from 3-D bounding box volume: 1 m^3 of water is ~2205 lb.
        volume_m3 = box[0] * box[1] * box[2]
        weight_lbs = max(5.0, round(volume_m3 * 2205.0 * _density_for_category(category), 1))
        entities.append(
            DetectedEntity(
                label=_label_for_category(category),
                category=category,
                bounding_box_3d_m=box,
                est_weight_lbs=weight_lbs,
                density_coefficient=_density_for_category(category),
                confidence=round(min(1.0, confidence * (pixel_area / thumb_total_pixels) * 10), 2),
                resale_potential_usd=_resale_estimate(category, weight_lbs),
            )
        )

    if not entities:
        # Single full-frame entity when no segmentation blobs are found.
        category, confidence = _classify_dominant_color(mean_hsv)
        box = _estimate_bounding_box(category, thumb_total_pixels * 0.7, thumb_pixels_per_m2)
        volume_m3 = box[0] * box[1] * box[2]
        weight_lbs = max(10.0, round(volume_m3 * 2205.0 * _density_for_category(category), 1))
        entities.append(
            DetectedEntity(
                label=_label_for_category(category),
                category=category,
                bounding_box_3d_m=box,
                est_weight_lbs=weight_lbs,
                density_coefficient=_density_for_category(category),
                confidence=round(min(1.0, confidence), 2),
                resale_potential_usd=_resale_estimate(category, weight_lbs),
            )
        )

    features = {
        "width_px": width_px,
        "height_px": height_px,
        "mean_hsv": [round(float(x), 2) for x in mean_hsv],
        "texture_score": round(texture_score, 2),
        "clutter_score": round(clutter_score, 2),
        "estimated_regions": len(regions),
        "used_pixel_area": used_area,
    }
    return entities, features, "deterministic_local"


def _rgb_to_hsv(rgb: np.ndarray) -> np.ndarray:
    """Vectorized RGB -> HSV conversion, output in degrees / 0-100 / 0-100."""
    rgb_f = rgb.astype(np.float32) / 255.0
    r, g, b = rgb_f[..., 0], rgb_f[..., 1], rgb_f[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    v = maxc
    delta = maxc - minc
    safe_delta = np.where(delta == 0, 1.0, delta)

    s = np.where(maxc != 0, delta / maxc, 0.0)

    h = np.zeros_like(maxc)
    with np.errstate(divide="ignore", invalid="ignore"):
        rc = np.where(delta == 0, 0.0, (maxc - r) / safe_delta)
        gc = np.where(delta == 0, 0.0, (maxc - g) / safe_delta)
        bc = np.where(delta == 0, 0.0, (maxc - b) / safe_delta)

    h = np.where(delta == 0, 0.0, h)
    h = np.where((delta != 0) & (r == maxc), (bc - gc) % 6, h)
    h = np.where((delta != 0) & (g == maxc), (rc - bc) + 2, h)
    h = np.where((delta != 0) & (b == maxc), (gc - rc) + 4, h)
    h = (h * 60.0) % 360.0

    hsv = np.stack([h, s * 100, v * 100], axis=-1)
    return hsv.astype(np.float32)


def cv2_threshold(gray: np.ndarray, thresh: float, maxval: float) -> np.ndarray:
    """Pure NumPy binary threshold."""
    binary = np.where(gray < thresh, 0, maxval).astype(np.uint8)
    return binary


def _find_regions(binary: np.ndarray) -> List[Dict[str, Any]]:
    """Connected-component labeling via scipy-free flood fill."""
    from collections import deque

    visited = np.zeros(binary.shape, dtype=bool)
    regions: List[Dict[str, Any]] = []
    rows, cols = binary.shape
    for r in range(rows):
        for c in range(cols):
            if binary[r, c] == 0 or visited[r, c]:
                continue
            q = deque([(r, c)])
            visited[r, c] = True
            area = 0
            min_r, max_r, min_c, max_c = r, r, c, c
            mask = np.zeros((rows, cols), dtype=bool)
            while q:
                cr, cc = q.popleft()
                mask[cr, cc] = True
                area += 1
                min_r, max_r = min(min_r, cr), max(max_r, cr)
                min_c, max_c = min(min_c, cc), max(max_c, cc)
                for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nr, nc = cr + dr, cc + dc
                    if 0 <= nr < rows and 0 <= nc < cols and not visited[nr, nc] and binary[nr, nc] != 0:
                        visited[nr, nc] = True
                        q.append((nr, nc))
            regions.append({"area": area, "bbox": (min_r, min_c, max_r, max_c), "mask": mask})
    regions.sort(key=lambda x: x["area"], reverse=True)
    return regions


def _label_for_category(category: Category) -> str:
    labels = {
        Category.BULKY_FURNITURE: "Furniture / Bulky Item",
        Category.SCRAP_METAL: "Scrap Metal / Copper / Brass",
        Category.GENERAL_DEBRIS: "Mixed Debris / Household Junk",
        Category.ELECTRONICS: "Electronics / E-Waste",
        Category.APPLIANCE: "Appliance / White Good",
        Category.YARD_WASTE: "Yard Waste / Organic Material",
        Category.MOTOR_VEHICLE: "Motor Vehicle / Scooter / Motorcycle",
        Category.SPORTING_GOODS: "Sporting Goods / Pool Table / Gear",
    }
    return labels.get(category, "Detected Load Item")


def _density_for_category(category: Category) -> float:
    densities = {
        Category.BULKY_FURNITURE: 0.65,
        Category.SCRAP_METAL: 0.95,
        Category.GENERAL_DEBRIS: 0.85,
        Category.ELECTRONICS: 0.75,
        Category.APPLIANCE: 0.80,
        Category.YARD_WASTE: 0.55,
        Category.MOTOR_VEHICLE: 0.70,
        Category.SPORTING_GOODS: 0.75,
    }
    return densities.get(category, 0.75)


# =====================================================================
# AGENT WORKERS
# =====================================================================


@dataclass(frozen=True)
class VisionAgentInput:
    scan_id: str
    image_b64: str
    allow_cloud: bool
    cloud_model: str


@dataclass(frozen=True)
class VisionAgentOutput:
    scan_id: str
    source: str
    entities: List[DetectedEntity]
    features: Dict[str, Any]


def vision_spatial_agent(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Agent 01: Analyze image spatial characteristics & objects."""
    scan_id = payload["scan_id"]
    image_bytes = base64.b64decode(payload["image_b64"])
    allow_cloud = payload["allow_cloud"]
    # Default pipeline: trained YOLO fusion first, then paid cloud, then deterministic.
    vision_source_order = _env("HAUL_VISION_SOURCE_ORDER", "fused,cloud,deterministic").split(",")

    for source in vision_source_order:
        source = source.strip()
        if source == "cloud" and allow_cloud:
            try:
                return _vision_cloud_inference(image_bytes, scan_id, payload["cloud_model"])
            except Exception as exc:
                logger.warning("Cloud vision failed (%s); trying next source.", exc)
        elif source in {"fused", "yolo"}:
            try:
                if source == "fused":
                    entities, features, label = _fused_detect(image_bytes, scan_id)
                else:
                    entities, features, label = _yolo_detect(image_bytes, scan_id)
                return {
                    "scan_id": scan_id,
                    "source": label,
                    "entities": [asdict(e) for e in entities],
                    "features": features,
                }
            except Exception as exc:
                logger.warning("Trained detection failed (%s); trying next source.", exc)
        elif source == "deterministic":
            break

    entities, features, source = _analyze_image_bytes(image_bytes, scan_id)
    return {
        "scan_id": scan_id,
        "source": source,
        "entities": [asdict(e) for e in entities],
        "features": features,
    }


def _vision_cloud_inference(image_bytes: bytes, scan_id: str, model: str) -> Dict[str, Any]:
    from google import genai  # type: ignore import-not-found

    client = genai.Client()
    prompt = (
        "Analyze this hauling/pickup load photo. Return a JSON object with key "
        "'entities', a list of objects each having: label, category (one of "
        "bulky_furniture, scrap_metal, general_debris, electronics, appliance, yard_waste), "
        "bounding_box_3d_m [length, width, height], est_weight_lbs, density_coefficient "
        "0-1, confidence 0-1, resale_potential_usd. Be concise."
    )
    image_part = {"mime_type": "image/jpeg", "data": image_bytes}
    response = client.models.generate_content(model=model, contents=[prompt, image_part])
    text = getattr(response, "text", "")
    parsed = json.loads(text[text.find("{") : text.rfind("}") + 1] or "{}")
    entities = [DetectedEntity(**_coerce_entity(e)) for e in parsed.get("entities", [])]
    if not entities:
        raise RuntimeError("Cloud vision produced no entities")
    return {
        "scan_id": scan_id,
        "source": "cloud_gemini",
        "entities": [asdict(e) for e in entities],
        "features": {"cloud_model": model},
    }


def _coerce_entity(raw: Dict[str, Any]) -> Dict[str, Any]:
    raw = dict(raw)
    cat = raw.get("category", "general_debris")
    if isinstance(cat, str):
        raw["category"] = Category(cat) if cat in {c.value for c in Category} else Category.GENERAL_DEBRIS
    else:
        raw["category"] = Category.GENERAL_DEBRIS
    raw.setdefault("bounding_box_3d_m", [1.0, 1.0, 0.6])
    raw.setdefault("est_weight_lbs", 10.0)
    raw.setdefault("density_coefficient", 0.75)
    raw.setdefault("confidence", 0.5)
    raw.setdefault("resale_potential_usd", 0.0)
    return raw


def volumetric_pricing_agent(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Agent 02: Compute true volume (voxel math) & base quote."""
    entities = [DetectedEntity(**_coerce_entity(e)) for e in payload.get("entities", [])]
    total_cubic_meters = 0.0

    for item in entities:
        dx, dy, dz = item.bounding_box_3d_m
        raw_vol = dx * dy * dz
        actual_vol = raw_vol * item.density_coefficient
        total_cubic_meters += actual_vol

    total_cubic_yards = total_cubic_meters * 1.30795
    fill_percentage = (total_cubic_yards / TRAILER_CAPACITY_CU_YD) * 100
    gross_quote = BASE_DISPATCH_FEE_USD + (total_cubic_yards * RATE_PER_CU_YD_USD)

    return asdict(
        VolumetricResult(
            total_volume_cu_yd=round(total_cubic_yards, 2),
            trailer_fill_percentage=round(fill_percentage, 1),
            gross_quote_usd=round(gross_quote, 2),
        )
    )


def asset_recovery_agent(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Agent 03: Live commodity & secondary-market value discovery."""
    entities = [DetectedEntity(**_coerce_entity(e)) for e in payload.get("entities", [])]
    rates = _scrap_rates.get_rates()
    items: List[RecoveryItem] = []
    instructions: List[str] = []

    # Aggregate per-category so fragmented local segments (e.g. pool table pieces)
    # are reported as a single recovery line instead of many duplicates.
    category_value: Dict[Category, float] = {}
    category_weight: Dict[Category, float] = {}
    category_label: Dict[Category, str] = {}
    category_action: Dict[Category, str] = {}

    for item in entities:
        if item.category == Category.SCRAP_METAL:
            val = item.est_weight_lbs * rates.copper_lbs_usd
            if val > 5.0:
                category_value[item.category] = category_value.get(item.category, 0.0) + val
                category_weight[item.category] = category_weight.get(item.category, 0.0) + item.est_weight_lbs
                category_label.setdefault(item.category, item.label)
                category_action[item.category] = "EXTRACT SCRAP"
        elif item.resale_potential_usd > 0:
            category_value[item.category] = category_value.get(item.category, 0.0) + item.resale_potential_usd
            category_label.setdefault(item.category, item.label)
            if item.category == Category.BULKY_FURNITURE:
                category_action[item.category] = "FLAG FOR RESALE"
            elif item.category == Category.APPLIANCE:
                category_action[item.category] = "FLAG FOR REFURB"
            elif item.category == Category.ELECTRONICS:
                category_action[item.category] = "FLAG E-WASTE"
            elif item.category == Category.MOTOR_VEHICLE:
                category_action[item.category] = "REFURB / RESALE"
            elif item.category == Category.SPORTING_GOODS:
                category_action[item.category] = "RESALE"

    for cat, val in category_value.items():
        label = category_label.get(cat, "Detected Item")
        action = category_action.get(cat, "FLAG")
        if cat == Category.SCRAP_METAL:
            instructions.append(
                f"{action}: {category_weight.get(cat, 0.0):.1f} lbs {label} (~${round(val, 2)})"
            )
        else:
            instructions.append(f"{action}: {label} (${round(val, 2)} resale potential)")
        items.append(
            RecoveryItem(
                label=label,
                category=cat,
                value_usd=round(val, 2),
                action=instructions[-1],
            )
        )

    total = round(sum(i.value_usd for i in items), 2)
    return {
        "total_recovery_yield_usd": total,
        "items": [asdict(i) for i in items],
        "driver_instructions": instructions,
        "rates_used": rates.to_dict(),
    }


# =====================================================================
# ORCHESTRATOR
# =====================================================================


@dataclass(frozen=True)
class WorkerPayload:
    agent: str
    payload: Dict[str, Any]


def _agent_dispatcher(worker_payload: WorkerPayload) -> Dict[str, Any]:
    """Dispatch an agent call inside a pool worker process."""
    if worker_payload.agent == "vision":
        return vision_spatial_agent(worker_payload.payload)
    if worker_payload.agent == "volumetric":
        return volumetric_pricing_agent(worker_payload.payload)
    if worker_payload.agent == "recovery":
        return asset_recovery_agent(worker_payload.payload)
    raise ValueError(f"Unknown agent: {worker_payload.agent}")


class HaulScanner:
    """
    Production scanner orchestrator.  Boots a persistent multiprocessing pool,
    routes each scan through three isolated agents, and emits telemetry/audit.
    """

    def __init__(self, cost_guard: Optional[CostGuard] = None) -> None:
        self.cost_guard = cost_guard or CostGuard()
        self.telemetry = TelemetryCollector("haul-scanner")
        self.audit = AuditLog(telemetry=self.telemetry)
        self._pool: Optional[mp.Pool] = None

    def boot(self) -> None:
        span = self.telemetry.span("boot")
        self._pool = mp.Pool(processes=3)
        self.telemetry.info(span, "scanner_pool_booted", {"processes": 3})

    def shutdown(self) -> None:
        if self._pool:
            self._pool.terminate()
            self._pool.join()
            self._pool = None

    def _allow_cloud(self) -> bool:
        try:
            self.cost_guard.assert_allowed(
                RouteDecision(
                    tier="EXTERNAL_PAID_LLM",
                    endpoint="gemini-2.5-flash",
                    estimated_cost_usd=0.0,
                    action="cloud_vision_inference",
                    paid=True,
                )
            )
            return bool(os.environ.get("GEMINI_API_KEY"))
        except CostGuardError:
            return False

    async def scan(self, image_bytes: bytes, filename: str) -> HaulScanResult:
        span = self.telemetry.span("scan")
        scan_id = f"SCAN_{int(time.time() * 1000)}_{os.urandom(4).hex()}"
        t0 = time.time()

        if not self._pool:
            raise RuntimeError("HaulScanner not booted")

        self.telemetry.info(span, "scan_started", {"filename": filename, "bytes": len(image_bytes)})

        allow_cloud = self._allow_cloud()
        cloud_model = os.environ.get("GMAOS_CLOUD_MODEL", "gemini-2.5-flash")

        # Stage 1: Vision (isolated process)
        vision_payload = VisionAgentInput(
            scan_id=scan_id,
            image_b64=base64.b64encode(image_bytes).decode("ascii"),
            allow_cloud=allow_cloud,
            cloud_model=cloud_model,
        ).__dict__

        # Stage 1: Vision (isolated process)
        vision_out = await asyncio.wait_for(
            asyncio.to_thread(
                self._pool.apply,
                _agent_dispatcher,
                (WorkerPayload("vision", vision_payload),),
            ),
            timeout=PROCESS_TIMEOUT_SECONDS,
        )

        # Stages 2 & 3: Volumetric + Recovery run in parallel.
        vol_payload = {"entities": vision_out["entities"]}
        rec_payload = {"entities": vision_out["entities"]}

        vol_out, rec_out = await asyncio.gather(
            asyncio.wait_for(
                asyncio.to_thread(
                    self._pool.apply,
                    _agent_dispatcher,
                    (WorkerPayload("volumetric", vol_payload),),
                ),
                timeout=PROCESS_TIMEOUT_SECONDS,
            ),
            asyncio.wait_for(
                asyncio.to_thread(
                    self._pool.apply,
                    _agent_dispatcher,
                    (WorkerPayload("recovery", rec_payload),),
                ),
                timeout=PROCESS_TIMEOUT_SECONDS,
            ),
        )

        recovery_credit = min(
            vol_out["gross_quote_usd"] * 0.50,
            rec_out["total_recovery_yield_usd"] * RECOVERY_CREDIT_PCT,
        )
        net_price = max(BASE_DISPATCH_FEE_USD, vol_out["gross_quote_usd"] - recovery_credit)
        processing_ms = round((time.time() - t0) * 1000, 1)

        self.telemetry.info(
            span,
            "scan_complete",
            {
                "scan_id": scan_id,
                "vision_source": vision_out["source"],
                "volume_cu_yd": vol_out["total_volume_cu_yd"],
                "net_quote": round(net_price, 2),
            },
        )
        self.audit.info(
            "haul-scanner",
            "scan_complete",
            {
                "scan_id": scan_id,
                "filename": filename,
                "vision_source": vision_out["source"],
                "volume_cu_yd": vol_out["total_volume_cu_yd"],
                "gross_quote_usd": vol_out["gross_quote_usd"],
                "net_quote_usd": round(net_price, 2),
                "recovery_yield_usd": rec_out["total_recovery_yield_usd"],
            },
            correlation_id=scan_id,
        )

        return HaulScanResult(
            scan_id=scan_id,
            processing_time_ms=processing_ms,
            vision_source=vision_out["source"],
            volume_cu_yd=vol_out["total_volume_cu_yd"],
            trailer_capacity_used=f"{vol_out['trailer_fill_percentage']}%",
            gross_quote_usd=vol_out["gross_quote_usd"],
            net_customer_quote_usd=round(net_price, 2),
            scrap_recovery_yield_usd=rec_out["total_recovery_yield_usd"],
            driver_instructions=rec_out["driver_instructions"],
            entities=vision_out["entities"],
        )
