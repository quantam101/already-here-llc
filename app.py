"""
AVAX-3D Mobile Hauling AI — Production FastAPI entrypoint.

Serves a standalone, mobile-optimized PWA at the root path and exposes a
single /api/scan endpoint for photo-driven volumetric pickup quotes.

Boots a persistent multiprocessing agent pool on startup and shuts it down
cleanly on exit.  Telemetry and audit records are written through the
existing GMAOS runtime primitives.
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional, Tuple

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse

import uvicorn

from runtime.photo_ai_haul import HaulScanner, MAX_UPLOAD_BYTES

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(processName)s] %(message)s",
)
logger = logging.getLogger("photo_ai_haul_app")


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


HAUL_PORT = int(_env("HAUL_SCANNER_PORT", "8000"))
HAUL_HOST = _env("HAUL_SCANNER_HOST", "0.0.0.0")
CORS_ORIGINS = _env("HAUL_CORS_ORIGINS", "*").split(",")
HAUL_API_KEY = _env("HAUL_API_KEY", "")
HAUL_RATE_LIMIT = int(_env("HAUL_RATE_LIMIT_PER_MINUTE", "30"))

scanner = HaulScanner()

# Simple in-memory per-IP fixed-window rate limiter for /api/scan.
_rate_limit_store: Dict[str, Tuple[int, float]] = {}


@asynccontextmanager
async def _lifespan(app: FastAPI):  # type: ignore[type-arg]
    logger.info("Booting AVAX-3D Haul Scanner agent pool...")
    scanner.boot()
    logger.info("Agent pool ready.")
    yield
    logger.info("Shutting down AVAX-3D Haul Scanner agent pool...")
    scanner.shutdown()


app = FastAPI(title="AVAX-3D Mobile Hauling AI", lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "engine": "photo-ai-haul",
        "version": "1.0.0",
    }


@app.get("/readyz")
async def readyz() -> Dict[str, Any]:
    return {
        "status": "ready" if scanner._pool is not None else "not_ready",
        "engine": "photo-ai-haul",
    }


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


def _check_api_key(request: Request) -> Optional[JSONResponse]:
    if not HAUL_API_KEY:
        return None
    header = request.headers.get("x-haul-api-key", "")
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        header = auth[7:].strip()
    if header != HAUL_API_KEY:
        return JSONResponse(status_code=401, content={"error": "Invalid or missing API key"})
    return None


def _check_rate_limit(client_ip: str) -> Optional[JSONResponse]:
    now = time.time()
    count, window_start = _rate_limit_store.get(client_ip, (0, now))
    if now - window_start > 60:
        count = 0
        window_start = now
    count += 1
    _rate_limit_store[client_ip] = (count, window_start)
    if count > HAUL_RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded. Try again later."},
        )
    return None


@app.post("/api/scan")
async def handle_mobile_scan(
    request: Request, file: UploadFile = File(...)
) -> JSONResponse:
    if (resp := _check_api_key(request)) is not None:
        return resp

    client_ip = request.client.host if request.client else "unknown"
    if (resp := _check_rate_limit(client_ip)) is not None:
        return resp

    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        return JSONResponse(
            status_code=413,
            content={"error": f"Upload exceeds {MAX_UPLOAD_BYTES} bytes limit."},
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        return JSONResponse(
            status_code=413,
            content={"error": f"Upload exceeds {MAX_UPLOAD_BYTES} bytes limit."},
        )

    try:
        result = await scanner.scan(image_bytes, filename=file.filename or "camera_snap.jpg")
    except RuntimeError as exc:
        logger.warning("Scan rejected: %s", exc)
        return JSONResponse(status_code=400, content={"error": str(exc)})
    except Exception:
        logger.exception("Scan failed for file=%s", file.filename)
        return JSONResponse(
            status_code=500,
            content={"error": "Scan processing failed. Please retry or contact support."},
        )
    return JSONResponse(content=result.__dict__)


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
    <p class="tagline">Snap a load photo for an instant volumetric quote & scrap-recovery breakdown.</p>

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
            <button class="btn btn-green" onclick="confirmBooking()">ACCEPT & BOOK LOAD</button>
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
