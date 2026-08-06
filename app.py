"""
AVAX-3D Mobile Hauling AI — Global Enterprise FastAPI entrypoint.

Serves a standalone, mobile-optimized PWA at the root path and exposes a
single /api/scan endpoint for photo-driven volumetric pickup quotes.

Enterprise features:
  - Multi-tenant API key auth with per-org rate limits and daily quotas.
  - Optional Redis-backed global rate limit / quota store.
  - Prometheus /metrics endpoint.
  - Request correlation IDs and structured JSON logging.
  - Stateless design suitable for horizontal scaling behind a load balancer.

Boots a persistent multiprocessing agent pool on startup and shuts it down
cleanly on exit. Telemetry and audit records are written through the existing
GMAOS runtime primitives.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse

import uvicorn

from runtime.photo_ai_feedback import FeedbackStore, get_feedback_store
from runtime.photo_ai_haul import HaulScanner, MAX_UPLOAD_BYTES
from runtime.photo_ai_store import ScanStore

# --------------------------------------------------------------------
# Environment helpers
# --------------------------------------------------------------------

def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _env_int(name: str, default: int) -> int:
    return int(os.environ.get(name, str(default)))


def _env_float(name: str, default: float) -> float:
    return float(os.environ.get(name, str(default)))


def _env_bool(name: str, default: bool) -> bool:
    return os.environ.get(name, str(default)).lower() in {"1", "true", "yes", "on"}


HAUL_PORT = _env_int("HAUL_SCANNER_PORT", 8000)
HAUL_HOST = _env("HAUL_SCANNER_HOST", "0.0.0.0")
CORS_ORIGINS = _env("HAUL_CORS_ORIGINS", "*").split(",")
LOG_JSON = _env_bool("HAUL_LOG_JSON", False)
SAVE_SCAN_IMAGES = _env_bool("HAUL_SAVE_SCAN_IMAGES", True)
SCAN_IMAGES_DIR = _env("HAUL_SCAN_IMAGES_DIR", "data/scan_images")

# Endpoints allowed without an API key when no keys are configured.
_PUBLIC_PATHS = {
    "/",
    "/healthz",
    "/readyz",
    "/manifest.json",
    "/.well-known/assetlinks.json",
    "/service-worker.js",
    "/icon-192.png",
    "/icon-512.png",
    "/api/scan",
}

# --------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------

def _save_scan_image(scan_id: str, image_bytes: bytes) -> Optional[str]:
    if not SAVE_SCAN_IMAGES or not image_bytes:
        return None
    try:
        from pathlib import Path
        dest = Path(SCAN_IMAGES_DIR) / f"{scan_id}.jpg"
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            f.write(image_bytes)
        return str(dest)
    except Exception:
        logger.exception("Failed to save scan image")
    return None


# Allowed image formats and a decompression-bomb guard.
HAUL_MAX_IMAGE_PIXELS = _env_int("HAUL_MAX_IMAGE_PIXELS", 50_000_000)
_ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}


def _validate_image_bytes(image_bytes: bytes) -> Tuple[bool, str, int, int]:
    """Validate uploaded image bytes: format, size, and decompression-bomb guard."""
    from PIL import Image
    import io

    try:
        Image.MAX_IMAGE_PIXELS = HAUL_MAX_IMAGE_PIXELS
        with Image.open(io.BytesIO(image_bytes)) as img:
            if img.format not in _ALLOWED_IMAGE_FORMATS:
                return False, f"Unsupported image format: {img.format}", 0, 0
            img.load()
            width, height = img.size
            if width * height > HAUL_MAX_IMAGE_PIXELS:
                return False, "Image dimensions exceed decompression limit", width, height
            return True, "", width, height
    except Image.DecompressionBombError as exc:
        return False, f"Decompression bomb detected: {exc}", 0, 0
    except Exception as exc:
        return False, f"Invalid image: {exc}", 0, 0

# --------------------------------------------------------------------
# Logging setup
# --------------------------------------------------------------------


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": dt.datetime.fromtimestamp(record.created, tz=dt.timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "source": f"{record.filename}:{record.lineno}",
        }
        if hasattr(record, "request_id"):
            payload["request_id"] = record.request_id
        if hasattr(record, "org_id"):
            payload["org_id"] = record.org_id
        extra = {k: v for k, v in record.__dict__.items() if k not in payload and not k.startswith("_")}
        if extra:
            payload.update(extra)
        return json.dumps(payload, default=str)


_handler = logging.StreamHandler()
if LOG_JSON:
    _handler.setFormatter(_JsonFormatter())
else:
    _handler.setFormatter(
        logging.Formatter(
            "%(asctime)s [%(levelname)s] [%(processName)s] %(message)s"
        )
    )

logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger("photo_ai_haul_app")

# --------------------------------------------------------------------
# Metrics helpers (Prometheus text exposition)
# --------------------------------------------------------------------


class _Metrics:
    """Thread-safe in-process Prometheus-style counters."""

    def __init__(self) -> None:
        self._counters: Dict[str, int] = {}
        self._histograms: Dict[str, List[float]] = {}
        self._lock = False  # simple flag, app is single-process async

    def inc(self, name: str, labels: Optional[Dict[str, str]] = None, value: int = 1) -> None:
        key = self._key(name, labels)
        self._counters[key] = self._counters.get(key, 0) + value

    def observe(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        key = self._key(name, labels)
        self._histograms.setdefault(key, []).append(value)

    def render(self) -> str:
        lines: List[str] = []
        for key, value in sorted(self._counters.items()):
            name, labels_str = key.rsplit("{", 1)
            lines.append(f"# TYPE {name} counter")
            lines.append(f"{name}{{{labels_str} {value}")
        for key, values in sorted(self._histograms.items()):
            name, labels_str = key.rsplit("{", 1)
            lines.append(f"# TYPE {name} histogram")
            for bucket in [0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]:
                count = sum(1 for v in values if v <= bucket)
                lines.append(f'{name}_bucket{{le="{bucket}",{labels_str} {count}')
            lines.append(f'{name}_bucket{{le="+Inf",{labels_str} {len(values)}')
            lines.append(f"{name}_sum{{{labels_str} {sum(values)}")
            lines.append(f"{name}_count{{{labels_str} {len(values)}")
        return "\n".join(lines) + "\n"

    @staticmethod
    def _key(name: str, labels: Optional[Dict[str, str]]) -> str:
        if labels:
            label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()) if v is not None)
            return f'{name}{{{label_str}}}'
        return f"{name}{{}}"


METRICS = _Metrics()

# --------------------------------------------------------------------
# Enterprise security helpers
# --------------------------------------------------------------------

def _parse_trailer_fill_pct(value: str) -> float:
    """Convert a '23.9%' trailer-fill string to a float percentage."""
    try:
        return float(value.replace("%", "").strip())
    except Exception:
        return 0.0


def _verify_request_signature(request: Request, body: bytes) -> bool:
    """
    Optional HMAC-SHA256 request signing for enterprise webhooks.

    The signature must be a hex digest of:
        METHOD|PATH|TIMESTAMP|NONCE|BODY
    using the shared secret. Requests older than 5 minutes or missing a nonce
    are rejected to prevent replay attacks.
    """
    if not HAUL_REQUEST_SIGNING_SECRET:
        return True
    signature = request.headers.get("x-haul-signature", "")
    timestamp = request.headers.get("x-haul-timestamp", "")
    nonce = request.headers.get("x-haul-nonce", "")
    if not timestamp or not nonce:
        return False
    try:
        ts = int(timestamp)
    except ValueError:
        return False
    if abs(time.time() - ts) > 300:
        return False
    payload = f"{request.method}|{request.url.path}|{timestamp}|{nonce}|".encode("utf-8") + body
    expected = hmac.new(
        HAUL_REQUEST_SIGNING_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    # Constant-time compare to prevent timing side-channels.
    return hmac.compare_digest(signature.lower(), expected.lower())


# --------------------------------------------------------------------
# Multi-tenant auth, rate limits, and quotas
# --------------------------------------------------------------------


def _parse_api_keys() -> Dict[str, Dict[str, Any]]:
    """Parse HAUL_API_KEYS JSON or fall back to HAUL_API_KEY."""
    keys_json = _env("HAUL_API_KEYS", "").strip()
    if keys_json:
        try:
            parsed = json.loads(keys_json)
            # Accept either a dict keyed by key, or a list of objects containing `key`.
            if isinstance(parsed, dict):
                return {k: _normalize_key_config(v) for k, v in parsed.items()}
            if isinstance(parsed, list):
                return {item["key"]: _normalize_key_config(item) for item in parsed}
        except Exception as exc:
            logger.warning("HAUL_API_KEYS is invalid JSON: %s", exc)

    single_key = _env("HAUL_API_KEY", "").strip()
    if single_key:
        return {
            single_key: _normalize_key_config(
                {
                    "org": "default",
                    "tier": "enterprise",
                    "rpm": _env_int("HAUL_RATE_LIMIT_PER_MINUTE", 30),
                }
            )
        }
    return {}


def _normalize_key_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    tier = cfg.get("tier", "enterprise")
    rpm_by_tier = {"free": 10, "pro": 100, "enterprise": 1000}
    quota_by_tier = {"free": 50, "pro": 500, "enterprise": 10000}
    return {
        "org": str(cfg.get("org", "unknown")),
        "tier": tier,
        "rpm": int(cfg.get("rpm", rpm_by_tier.get(tier, 1000))),
        "daily_quota": int(cfg.get("daily_quota", quota_by_tier.get(tier, 10000))),
    }


class _MemoryRateStore:
    """Per-process in-memory rate limit / quota store."""

    def __init__(self) -> None:
        self._windows: Dict[str, List[float]] = {}
        self._daily: Dict[str, Dict[str, int]] = {}

    def allow(self, org_id: str, rpm: int, daily_quota: int) -> Tuple[bool, Optional[str]]:
        now = time.time()
        today = dt.datetime.fromtimestamp(now, tz=dt.timezone.utc).strftime("%Y-%m-%d")

        if rpm > 0:
            window = self._windows.setdefault(org_id, [])
            cutoff = now - 60
            self._windows[org_id] = [ts for ts in window if ts > cutoff]
            if len(self._windows[org_id]) >= rpm:
                return False, "rate_limit"

        if daily_quota > 0:
            daily_count = self._daily.setdefault(org_id, {}).get(today, 0)
            if daily_count >= daily_quota:
                return False, "quota"

        # Record only when at least one limit is configured.
        if rpm > 0:
            self._windows[org_id].append(now)
        if daily_quota > 0:
            self._daily.setdefault(org_id, {})[today] = self._daily[org_id].get(today, 0) + 1
        return True, None

    def usage(self, org_id: str) -> Dict[str, Any]:
        now = time.time()
        today = dt.datetime.fromtimestamp(now, tz=dt.timezone.utc).strftime("%Y-%m-%d")
        window = [ts for ts in self._windows.get(org_id, []) if ts > now - 60]
        return {
            "requests_last_60s": len(window),
            "requests_today": self._daily.get(org_id, {}).get(today, 0),
        }


class _RedisRateStore:
    """Global Redis-backed rate limit / quota store for multi-pod deployments."""

    def __init__(self, redis_url: str) -> None:
        import redis as redis_lib  # type: ignore
        self._client = redis_lib.from_url(redis_url, decode_responses=True)

    def allow(self, org_id: str, rpm: int, daily_quota: int) -> Tuple[bool, Optional[str]]:
        import redis as redis_lib
        if rpm <= 0 and daily_quota <= 0:
            return True, None

        now = time.time()
        today = dt.datetime.fromtimestamp(now, tz=dt.timezone.utc).strftime("%Y-%m-%d")
        window_key = f"haul:ratelimit:{org_id}"
        quota_key = f"haul:quota:{org_id}:{today}"

        pipe = self._client.pipeline()
        if rpm > 0:
            pipe.zremrangebyscore(window_key, 0, now - 60)
            pipe.zcard(window_key)
        if daily_quota > 0:
            pipe.get(quota_key)
        try:
            results = pipe.execute()
        except redis_lib.RedisError as exc:
            logger.warning("Redis rate-limit query failed: %s; falling back to allow", exc)
            return True, None

        if rpm > 0:
            window_count = int(results[1] or 0)
            if window_count >= rpm:
                return False, "rate_limit"

        if daily_quota > 0:
            daily_offset = 2 if rpm > 0 else 0
            daily_count = int(results[daily_offset] or 0)
            if daily_count >= daily_quota:
                return False, "quota"

        pipe = self._client.pipeline()
        if rpm > 0:
            pipe.zadd(window_key, {str(now): now})
            pipe.expire(window_key, 120)
        if daily_quota > 0:
            pipe.incr(quota_key)
            pipe.expire(quota_key, 86400)
        try:
            pipe.execute()
        except redis_lib.RedisError as exc:
            logger.warning("Redis rate-limit update failed: %s; allowing request", exc)
        return True, None

    def usage(self, org_id: str) -> Dict[str, Any]:
        import redis as redis_lib
        now = time.time()
        today = dt.datetime.fromtimestamp(now, tz=dt.timezone.utc).strftime("%Y-%m-%d")
        window_key = f"haul:ratelimit:{org_id}"
        quota_key = f"haul:quota:{org_id}:{today}"
        try:
            pipe = self._client.pipeline()
            pipe.zremrangebyscore(window_key, 0, now - 60)
            pipe.zcard(window_key)
            pipe.get(quota_key)
            _, window_count, daily_count = pipe.execute()
        except redis_lib.RedisError as exc:
            logger.warning("Redis usage query failed: %s", exc)
            return {"requests_last_60s": 0, "requests_today": 0}
        return {
            "requests_last_60s": int(window_count or 0),
            "requests_today": int(daily_count or 0),
        }


def _make_rate_store() -> Union[_MemoryRateStore, _RedisRateStore]:
    redis_url = _env("REDIS_URL", "").strip() or _env("REDIS_ENDPOINT", "").strip()
    if redis_url:
        try:
            return _RedisRateStore(redis_url)
        except Exception as exc:
            logger.warning("Failed to initialize Redis rate store: %s; using in-memory store", exc)
    return _MemoryRateStore()


API_KEYS = _parse_api_keys()
RATE_STORE = _make_rate_store()


class _EnterpriseAuth:
    """Authenticate requests and enforce per-organization rate limits / quotas."""

    def __init__(self, keys: Dict[str, Dict[str, Any]], store: Any) -> None:
        self.keys = keys
        self.store = store

    def is_enabled(self) -> bool:
        return bool(self.keys)

    def authenticate(self, request: Request) -> Tuple[Optional[Dict[str, Any]], Optional[JSONResponse]]:
        if not self.keys:
            if request.url.path not in _PUBLIC_PATHS:
                return None, JSONResponse(
                    status_code=401,
                    content={"error": "API key required. Configure HAUL_API_KEY or HAUL_API_KEYS."},
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return {
                "org": "anonymous",
                "tier": "none",
                "rpm": _env_int("HAUL_RATE_LIMIT_PER_MINUTE", 30),
                "daily_quota": _env_int("HAUL_ANONYMOUS_DAILY_QUOTA", 1000),
            }, None

        header = request.headers.get("x-haul-api-key", "")
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            header = auth[7:].strip()

        config = self.keys.get(header)
        if not config:
            return None, JSONResponse(
                status_code=401,
                content={"error": "Invalid or missing API key"},
                headers={"WWW-Authenticate": "Bearer"},
            )
        return config, None

    def check_limit(self, org_config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        org_id = org_config["org"]
        return self.store.allow(org_id, org_config["rpm"], org_config["daily_quota"])


AUTH = _EnterpriseAuth(API_KEYS, RATE_STORE)
SCAN_STORE = ScanStore()
FEEDBACK_STORE: FeedbackStore = get_feedback_store()
HAUL_REQUEST_SIGNING_SECRET = _env("HAUL_REQUEST_SIGNING_SECRET", "")

# --------------------------------------------------------------------
# FastAPI application lifecycle
# --------------------------------------------------------------------

scanner = HaulScanner()


@asynccontextmanager
async def _lifespan(app: FastAPI):  # type: ignore[type-arg]
    logger.info("Booting AVAX-3D Haul Scanner agent pool...")
    scanner.boot()
    logger.info("Agent pool ready.")
    yield
    logger.info("Shutting down AVAX-3D Haul Scanner agent pool...")
    scanner.shutdown()


app = FastAPI(title="AVAX-3D Mobile Hauling AI — Enterprise", lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "HEAD", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "X-Haul-Api-Key",
        "X-Haul-Signature",
        "X-Haul-Timestamp",
        "X-Haul-Nonce",
        "X-Request-Id",
    ],
)


@app.middleware("http")
async def _request_logging_middleware(request: Request, call_next: Callable) -> Any:
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled exception", extra={"request_id": request_id})
        raise
    duration = time.time() - start
    logger.info(
        "%s %s %s %.3fs",
        request.method,
        request.url.path,
        response.status_code,
        duration,
        extra={"request_id": request_id},
    )
    response.headers["X-Request-ID"] = request_id
    return response


# --------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------

@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "engine": "photo-ai-haul",
        "version": "2.0.0-enterprise",
    }


@app.get("/readyz")
async def readyz() -> Dict[str, Any]:
    return {
        "status": "ready" if scanner._pool is not None else "not_ready",
        "engine": "photo-ai-haul",
    }


@app.get("/metrics")
async def metrics() -> PlainTextResponse:
    return PlainTextResponse(METRICS.render(), media_type="text/plain; version=0.0.4")


@app.get("/", response_class=HTMLResponse)
def get_mobile_app() -> str:
    """Serve the standalone PWA / smartphone interface."""
    return _MOBILE_HTML


@app.get("/manifest.json")
def manifest() -> FileResponse:
    return FileResponse("public/manifest.json", media_type="application/json")


@app.get("/.well-known/assetlinks.json")
def assetlinks() -> FileResponse:
    return FileResponse("public/assetlinks.json", media_type="application/json")


@app.get("/service-worker.js")
def service_worker() -> PlainTextResponse:
    return PlainTextResponse(
        open("public/service-worker.js").read(),
        media_type="application/javascript",
    )


@app.get("/icon-192.png")
def icon_192() -> FileResponse:
    return FileResponse("public/icon-192.png")


@app.get("/icon-512.png")
def icon_512() -> FileResponse:
    return FileResponse("public/icon-512.png")


@app.post("/api/scan")
async def handle_mobile_scan(request: Request, file: UploadFile = File(...)) -> JSONResponse:
    org_config, error = AUTH.authenticate(request)
    if error:
        METRICS.inc("haul_scan_errors_total", {"reason": "unauthorized"})
        return error

    org_id = org_config["org"] if org_config else "anonymous"

    allowed, reason = AUTH.check_limit(org_config)
    if not allowed:
        METRICS.inc("haul_scan_errors_total", {"reason": reason or "limit"})
        return JSONResponse(
            status_code=429,
            content={"error": f"Rate limit or quota exceeded: {reason}"},
        )

    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        METRICS.inc("haul_scan_errors_total", {"reason": "payload_too_large"})
        return JSONResponse(
            status_code=413,
            content={"error": f"Upload exceeds {MAX_UPLOAD_BYTES} bytes limit."},
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        METRICS.inc("haul_scan_errors_total", {"reason": "payload_too_large"})
        return JSONResponse(
            status_code=413,
            content={"error": f"Upload exceeds {MAX_UPLOAD_BYTES} bytes limit."},
        )

    valid, error_msg, _, _ = _validate_image_bytes(image_bytes)
    if not valid:
        METRICS.inc("haul_scan_errors_total", {"reason": "invalid_image"})
        return JSONResponse(status_code=400, content={"error": error_msg})

    # Optional request-signature hardening for enterprise webhooks.
    if HAUL_REQUEST_SIGNING_SECRET and not _verify_request_signature(request, image_bytes):
        METRICS.inc("haul_scan_errors_total", {"reason": "invalid_signature"})
        return JSONResponse(status_code=401, content={"error": "Invalid request signature"})

    start = time.time()
    try:
        result = await scanner.scan(image_bytes, filename=file.filename or "camera_snap.jpg")
    except RuntimeError as exc:
        logger.warning("Scan rejected for org=%s: %s", org_id, exc, extra={"org_id": org_id})
        METRICS.inc("haul_scan_errors_total", {"reason": "rejected"})
        return JSONResponse(status_code=400, content={"error": str(exc)})
    except Exception:
        logger.exception("Scan failed for org=%s", org_id, extra={"org_id": org_id})
        METRICS.inc("haul_scan_errors_total", {"reason": "exception"})
        return JSONResponse(
            status_code=500,
            content={"error": "Scan processing failed. Please retry or contact support."},
        )

    duration = time.time() - start
    METRICS.inc("haul_scans_total", {"org": org_id, "tier": org_config.get("tier", "none")})
    METRICS.observe("haul_scan_duration_seconds", duration, {"org": org_id})

    # Persist scan image for later feedback/retraining.
    _save_scan_image(result.scan_id, image_bytes)

    # Persist scan metadata for usage and billing.
    trailer_fill_pct = _parse_trailer_fill_pct(result.trailer_capacity_used)
    SCAN_STORE.record_scan(
        org_id=org_id,
        scan_id=result.scan_id,
        vision_source=result.vision_source,
        volume_cu_yd=result.volume_cu_yd,
        gross_quote_usd=result.gross_quote_usd,
        net_customer_quote_usd=result.net_customer_quote_usd,
        scrap_recovery_yield_usd=result.scrap_recovery_yield_usd,
        trailer_fill_pct=trailer_fill_pct,
        entities=result.entities,
    )

    return JSONResponse(content=result.__dict__)


@app.get("/api/usage")
async def usage(request: Request) -> JSONResponse:
    org_config, error = AUTH.authenticate(request)
    if error:
        return error
    org_id = org_config["org"]
    return JSONResponse(
        content={
            "org": org_id,
            "tier": org_config["tier"],
            "rpm_limit": org_config["rpm"],
            "daily_quota": org_config["daily_quota"],
            "rate_usage": RATE_STORE.usage(org_id),
            "scan_usage": SCAN_STORE.get_usage(org_id, period_days=30),
            "billing": SCAN_STORE.get_billing(org_id),
        }
    )


@app.get("/api/scans")
async def scans(request: Request, limit: int = 50) -> JSONResponse:
    org_config, error = AUTH.authenticate(request)
    if error:
        return error
    org_id = org_config["org"]
    history = SCAN_STORE.get_scan_history(org_id, limit=min(limit, 200))
    return JSONResponse(
        content={
            "org": org_id,
            "scans": [
                {
                    "id": r.id,
                    "scan_id": r.scan_id,
                    "created_at": r.created_at,
                    "vision_source": r.vision_source,
                    "volume_cu_yd": r.volume_cu_yd,
                    "gross_quote_usd": r.gross_quote_usd,
                    "net_customer_quote_usd": r.net_customer_quote_usd,
                    "scrap_recovery_yield_usd": r.scrap_recovery_yield_usd,
                    "entities_count": len(r.entities),
                }
                for r in history
            ],
        }
    )


@app.get("/api/billing")
async def billing(request: Request) -> JSONResponse:
    org_config, error = AUTH.authenticate(request)
    if error:
        return error
    return JSONResponse(content=SCAN_STORE.get_billing(org_config["org"]))


@app.post("/api/feedback")
async def record_feedback(
    request: Request,
    file: Optional[UploadFile] = File(None),
    scan_id: str = Form(""),
    corrected_entities: str = Form("[]"),
    feedback_type: str = Form("correct"),
    notes: str = Form(""),
) -> JSONResponse:
    """Record user corrections for a scan to build a labeled training dataset."""
    org_config, error = AUTH.authenticate(request)
    if error:
        return error
    org_id = org_config["org"]

    image_bytes = await file.read() if file else None
    try:
        predicted = []
        if scan_id:
            # Attach the original predicted entities for reference.
            scan_record = SCAN_STORE.get_scan(org_id, scan_id)
            if scan_record:
                predicted = scan_record.entities
        corrected = json.loads(corrected_entities)
        feedback_id = FEEDBACK_STORE.record_feedback(
            org_id=org_id,
            scan_id=scan_id or None,
            image_bytes=image_bytes,
            predicted_entities=predicted,
            corrected_entities=corrected,
            feedback_type=feedback_type,
            notes=notes,
        )
    except Exception:
        logger.exception("Feedback recording failed")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to record feedback."},
        )
    return JSONResponse({"feedback_id": feedback_id, "status": "ok"})


@app.get("/api/feedback")
async def list_feedback(request: Request, limit: int = 50) -> JSONResponse:
    org_config, error = AUTH.authenticate(request)
    if error:
        return error
    rows = FEEDBACK_STORE.get_feedback(org_config["org"], limit=min(limit, 200))
    return JSONResponse(
        {
            "org": org_config["org"],
            "count": len(rows),
            "feedback": [
                {
                    "id": r.id,
                    "scan_id": r.scan_id,
                    "created_at": r.created_at,
                    "feedback_type": r.feedback_type,
                    "notes": r.notes,
                    "image_path": r.image_path,
                    "image_width": r.image_width,
                    "image_height": r.image_height,
                    "predicted_entities": r.predicted_entities,
                    "corrected_entities": r.corrected_entities,
                }
                for r in rows
            ],
        }
    )


@app.get("/api/feedback/export")
async def export_feedback(
    request: Request,
    fmt: str = "yolo",
    as_zip: bool = False,
) -> JSONResponse:
    """Export labeled feedback as a YOLO or COCO object-detection dataset."""
    org_config, error = AUTH.authenticate(request)
    if error:
        return error
    try:
        if as_zip:
            path = FEEDBACK_STORE.export_zip(org_config["org"], fmt=fmt)
            return FileResponse(path, media_type="application/zip", filename=f"haul_feedback_{org_config['org']}_{fmt}.zip")
        else:
            path = (
                FEEDBACK_STORE.export_yolo(org_config["org"])
                if fmt == "yolo"
                else FEEDBACK_STORE.export_coco(org_config["org"])
            )
            return JSONResponse({"export_dir": path, "format": fmt})
    except Exception:
        logger.exception("Feedback export failed")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to export feedback dataset."},
        )


# --------------------------------------------------------------------
# PWA HTML (same mobile-first UI)
# --------------------------------------------------------------------

_MOBILE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0f172a">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icon-192.png">
    <title>AVAX-3D Mobile AI Hauler</title>
    <style>
        :root { --bg: #0f172a; --card: #1e293b; --accent: #38bdf8; --green: #22c55e; --amber: #f59e0b; --text: #f8fafc; }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; line-height: 1.4; }
        .card { background: var(--card); border-radius: 16px; padding: 20px; margin-bottom: 16px; border: 1px solid #334155; box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
        h1 { font-size: 22px; text-align: center; color: var(--accent); margin-top: 0; }
        .tagline { text-align:center; font-size: 14px; color: #94a3b8; margin: 8px 0 0; }
        .btn { display: block; width: 100%; background: var(--accent); color: #000; font-weight: bold; padding: 16px; border-radius: 12px; border: none; font-size: 16px; cursor: pointer; text-align: center; transition: transform 0.1s; }
        .btn:active { transform: scale(0.98); }
        .btn-green { background: var(--green); color: #fff; margin-top: 12px; }
        input[type="file"] { display: none; }
        .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        .metric-box { background: #0f172a; padding: 12px; border-radius: 8px; text-align: center; }
        .metric-val { font-size: 22px; font-weight: bold; color: var(--accent); }
        .metric-lbl { font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-top: 4px; }
        .alert-item { background: #064e3b; border-left: 4px solid var(--green); padding: 10px; margin-top: 8px; border-radius: 4px; font-size: 13px; }
        .alert-amber { background: #451a03; border-left-color: var(--amber); }
        #loading { display: none; text-align: center; font-style: italic; color: var(--accent); margin: 20px 0; }
        #preview { width: 100%; border-radius: 12px; margin-top: 12px; display: none; }
        .fine-print { font-size: 11px; color: #64748b; text-align: center; margin-top: 12px; }
    </style>
</head>
<body>
    <h1>AVAX-3D Mobile Scanner</h1>
    <p class="tagline">Snap a load photo for an instant volumetric quote &amp; scrap-recovery breakdown.</p>

    <div class="card">
        <label for="cameraInput" class="btn">SNAP LOAD PHOTO</label>
        <input type="file" id="cameraInput" accept="image/*" capture="environment" onchange="processScan()">
        <img id="preview" alt="Load preview">
    </div>

    <div id="loading">Processing through isolated multi-agent pipeline...</div>

    <div id="results" style="display:none;">
        <div class="card">
            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Customer Quote</div>
            <div style="font-size: 36px; font-weight: bold; color: #fff;" id="netQuote">$0.00</div>
            <div class="metric-grid">
                <div class="metric-box">
                    <div class="metric-val" id="volVal">0.0</div>
                    <div class="metric-lbl">Cubic Yards</div>
                </div>
                <div class="metric-box">
                    <div class="metric-val" id="fillVal">0%</div>
                    <div class="metric-lbl">Trailer Fill</div>
                </div>
            </div>
            <button class="btn btn-green" onclick="confirmBooking()">ACCEPT &amp; BOOK LOAD</button>
            <p class="fine-print">Cloud vision disabled by default. Enable paid mode to use Gemini 2.5 Flash.</p>
        </div>

        <div class="card">
            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Driver Recovery Manifest</div>
            <div style="font-size: 20px; font-weight: bold; color: var(--green);" id="scrapVal">+$0.00 Yield</div>
            <div id="alertList" style="margin-top: 8px;"></div>
        </div>
    </div>

    <script>
        async function processScan() {
            const fileInput = document.getElementById('cameraInput');
            if (!fileInput.files[0]) return;

            const preview = document.getElementById('preview');
            preview.src = URL.createObjectURL(fileInput.files[0]);
            preview.style.display = 'block';

            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').style.display = 'none';

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                const response = await fetch('/api/scan', { method: 'POST', body: formData });
                if (!response.ok) throw new Error((await response.json()).error || 'Scan failed');
                const data = await response.json();

                document.getElementById('loading').style.display = 'none';
                document.getElementById('results').style.display = 'block';

                document.getElementById('netQuote').innerText = '$' + data.net_customer_quote_usd.toFixed(2);
                document.getElementById('volVal').innerText = data.volume_cu_yd;
                document.getElementById('fillVal').innerText = data.trailer_capacity_used;
                document.getElementById('scrapVal').innerText = '+$' + data.scrap_recovery_yield_usd.toFixed(2) + ' Yield';

                const alertContainer = document.getElementById('alertList');
                alertContainer.innerHTML = '';
                if (data.driver_instructions.length === 0) {
                    alertContainer.innerHTML = '<div class="alert-item alert-amber">No significant recovery value detected.</div>';
                }
                data.driver_instructions.forEach(inst => {
                    const div = document.createElement('div');
                    div.className = 'alert-item';
                    div.innerText = inst;
                    alertContainer.appendChild(div);
                });
            } catch (err) {
                alert('Scan failed: ' + err.message);
                document.getElementById('loading').style.display = 'none';
            }
        }

        function confirmBooking() {
            const quote = document.getElementById('netQuote').innerText;
            alert('Booking confirmed at ' + quote + '. Dispatch will be notified.');
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js').catch(console.error);
        }
    </script>
</body>
</html>
"""


if __name__ == "__main__":
    uvicorn.run(app, host=HAUL_HOST, port=HAUL_PORT)
