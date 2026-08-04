---
name: testing-photo-ai-haul
description: End-to-end test workflow for the Photo AI Haul Scanner FastAPI PWA.
---

# Testing the Photo AI Haul Scanner

## Goal
Verify the mobile PWA (`/`) and `/api/scan` endpoint produce a net customer quote, cubic-yard volume, trailer fill percentage, scrap/recovery yield, and driver manifest from a real photo upload.

## Preconditions
- Python runtime deps are installed into the interpreter you will use (`/usr/bin/python` is known to work; the default `python` may be a pyenv shim without `numpy`/`Pillow`).
- The repo is cloned at `/home/ubuntu/repos/already-here-llc`.
- A test JPEG exists, e.g. `/tmp/test_load.jpg`.
- Optional: set `HAUL_API_KEY` and `HAUL_RATE_LIMIT_PER_MINUTE` if you are testing authenticated/rate-limited deployments; local dev defaults have no API key and 30 req/min.

## Start the service

```bash
cd /home/ubuntu/repos/already-here-llc
/usr/bin/python app.py
```

Or with explicit environment:

```bash
GMAOS_MODE=strict_zero_spend \
GMAOS_PAID_ADAPTERS_ENABLED=false \
GMAOS_AUDIT_LOG=/tmp/audit.jsonl \
HAUL_SCANNER_PORT=8000 \
/usr/bin/python app.py
```

## Verify health and PWA assets

```bash
curl -s http://localhost:8000/healthz
curl -s http://localhost:8000/readyz
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8000/manifest.json
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8000/service-worker.js
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8000/icon-192.png
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8000/icon-512.png
curl -F "file=@/tmp/test_load.jpg" http://localhost:8000/api/scan
```

## Browser / UI test

1. Open `http://localhost:8000/` in Chrome (mobile-size window ~430x900).
2. Click **SNAP LOAD PHOTO**.
3. Select `/tmp/test_load.jpg`.
4. Confirm the results panel shows:
   - Net customer quote in USD
   - Cubic yards
   - Trailer fill percentage
   - Recovery yield
   - Driver instructions
5. Click **ACCEPT & BOOK LOAD** and confirm the alert reflects the quoted amount.

## Pytest

```bash
/usr/bin/python -m pytest tests/test_photo_ai_haul.py -v
```

## Metrics, usage, and billing endpoints

```bash
curl -s http://localhost:8000/metrics | grep haul_scans_total
curl -s http://localhost:8000/api/usage
curl -s http://localhost:8000/api/scans
curl -s http://localhost:8000/api/billing
```

- `haul_scans_total` is a Prometheus counter incremented on every successful `/api/scan`.
- `/api/usage` and `/api/billing` aggregate persisted scan metadata from `data/haul_scans.db` (or `HAUL_SCAN_STORE=memory`).

## Browser / UI test

1. Open `http://localhost:8000/` in Chrome for Testing (mobile-size window ~430x900).
   - Typical binary: `/opt/.devin/chrome/chrome/linux-*/chrome-linux64/chrome`.
2. Click **SNAP LOAD PHOTO**.
3. In the GTK file picker, press `Ctrl+L` and type the absolute path to a test JPEG (e.g. `/tmp/pr130_test.jpg`).
4. Confirm the results panel shows:
   - Net customer quote in USD
   - Cubic yards
   - Trailer fill percentage
   - Recovery yield
   - Driver instructions
5. Click **ACCEPT & BOOK LOAD** and confirm the alert reflects the quoted amount.

## Pytest

```bash
/usr/bin/python -m pytest tests/ -v
```

## Notes
- Cloud vision (Gemini) is disabled by default in `strict_zero_spend` mode; the local deterministic analyzer should always work offline.
- YOLOv8 ONNX fusion is the default (`HAUL_VISION_SOURCE_ORDER=fused,cloud,deterministic`) when `models/yolov8n.onnx` exists and `HAUL_YOLO_ENABLED=true`.
- If the browser shows a `Scan failed: Unexpected token '<'...` alert, it usually means the server returned an HTML error page or the file input contained an invalid/non-image payload. Check server logs and `/api/scan` with curl first.
- If the green **ACCEPT & BOOK LOAD** button does not respond to the first automated click, scroll slightly and retry; the click handler is wired correctly (the alert appears on a second click at the correct coordinates).
