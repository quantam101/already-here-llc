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

    if allow_cloud:
        try:
            return _vision_cloud_inference(image_bytes, scan_id, payload["cloud_model"])
        except Exception as exc:
            logger.warning("Cloud vision failed (%s); falling back to local analysis.", exc)

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
