# Already Here LLC website

Lean multi-page B2B field-service website for Already Here LLC, built with Next.js App Router, TypeScript, and Tailwind CSS.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Level-4 resilient runtime layer for dispatch, health, runtime visibility, and LLM provider degradation
- Revenue Mesh v1 for daily income-lane scoring, productized automation offers, approval-gated execution, and task-replacement escalation
- Finnhub WebSocket runtime feed for paper/shadow trading proof-of-work, with Yahoo fallback when no Finnhub key is present

## Pages

- Home
- Services
- Who We Serve
- Contact / Dispatch
- AI Web Agent
- Photo AI Haul Scanner
- Revenue Mesh v1
- Privacy Policy
- Thank You

## Photo AI Haul Scanner

A standalone FastAPI microservice (`app.py`) for mobile photo-driven pickup / hauling / junk-removal quotes.

- Snaps a load photo from any smartphone browser.
- Runs an isolated multi-agent pipeline:
  1. **Vision Spatial Agent** — YOLOv8 ONNX for trained bounding boxes, TinyCLIP 40M ONNX for zero-shot fine-grained labels (motor scooter, pool table, helmet, etc.), fused with K-means segmentation.
  2. **Volumetric Agent** — computes true cubic-yard volume with density correction.
  3. **Asset Recovery Agent** — values scrap metal, resale, and refurb potential.
- Returns a net customer quote, trailer fill percentage, and a driver recovery manifest.

### Local usage

```bash
python -m pip install -r requirements.txt
python app.py
```

Open `http://localhost:8000` on your phone (same Wi-Fi) and tap **SNAP LOAD PHOTO**.

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `HAUL_SCANNER_HOST` | `0.0.0.0` | Bind host |
| `HAUL_SCANNER_PORT` | `8000` | Bind port |
| `HAUL_TRAILER_CAPACITY_CU_YD` | `10.6` | Trailer volume capacity |
| `HAUL_BASE_DISPATCH_FEE_USD` | `75.0` | Flat dispatch fee |
| `HAUL_RATE_PER_CU_YD_USD` | `38.0` | Per-cubic-yard hauling rate |
| `HAUL_RECOVERY_CREDIT_PCT` | `0.25` | Recovery credit applied to net quote |
| `HAUL_FRAME_WIDTH_METERS` | `2.5` | Assumed real-world frame width for local spatial calibration |
| `HAUL_MAX_UPLOAD_BYTES` | `26214400` | Max photo upload size (25 MiB) |
| `HAUL_RATE_LIMIT_PER_MINUTE` | `30` | Per-IP rate limit for `/api/scan` |
| `HAUL_API_KEY` | *(none)* | Optional API key required by `/api/scan` |
| `HAUL_CORS_ORIGINS` | `*` | Comma-separated allowed CORS origins |
| `GMAOS_PAID_ADAPTERS_ENABLED` | `false` | Enable cloud vision (Gemini) |
| `GEMINI_API_KEY` | *(none)* | Gemini API key for cloud vision |
| `HAUL_YOLO_ENABLED` | `true` | Run YOLOv8 ONNX local object detection |
| `HAUL_YOLO_MODEL_PATH` | `models/yolov8n.onnx` | ONNX model path |
| `HAUL_VISION_SOURCE_ORDER` | `fused,cloud,deterministic` | Vision pipeline priority |
| `HAUL_YOLO_CONF` | `0.55` | Minimum YOLO class confidence |
| `HAUL_YOLO_IOU` | `0.3` | YOLO NMS IoU threshold |
| `HAUL_YOLO_MAX_DETECTIONS` | `8` | Max YOLO detections per image |
| `HAUL_CLIP_ENABLED` | `true` | Run TinyCLIP zero-shot classification for fine-grained labels |
| `HAUL_CLIP_MODEL_DIR` | `models/tinyclip40` | TinyCLIP ONNX artifacts directory |
| `HAUL_CLIP_CONF` | `7.0` | Minimum TinyCLIP logit score for a label to be accepted |
| `HAUL_CLIP_MAX_CANDIDATES` | `12` | Max crops classified per image (latency control) |

The default vision pipeline is **yolov8_tinyclip_fused** (YOLOv8 ONNX boxes + TinyCLIP labels + deterministic segmentation), then cloud (Gemini), then deterministic fallback. YOLO and TinyCLIP are zero-cost local trained recognition; cloud vision is gated by `GMAOS_PAID_ADAPTERS_ENABLED=true` and `GEMINI_API_KEY`. Download TinyCLIP artifacts with `scripts/download_tinyclip40.sh` or at container build time.

### Endpoints

- `GET /` — Mobile PWA scanner UI
- `POST /api/scan` — Upload image (`multipart/form-data`) and receive quote JSON
- `GET /api/usage` — Per-organization rate-limit, scan usage, and billing
- `GET /api/scans` — Scan history for the authenticated organization
- `GET /api/billing` — Aggregated billing metrics for the authenticated organization
- `POST /api/feedback` — Submit corrected labels/ground-truth for a scan
- `GET /api/feedback` — List labeled feedback for the authenticated organization
- `GET /api/feedback/export?fmt=yolo|coco&as_zip=true` — Export labeled training dataset
- `GET /healthz` — Liveness probe
- `GET /readyz` — Readiness probe
- `GET /metrics` — Prometheus-compatible metrics

### Enterprise / multi-tenant configuration

| Variable | Default | Purpose |
|---|---|---|
| `HAUL_API_KEY` | *(none)* | Legacy single shared API key |
| `HAUL_API_KEYS` | *(none)* | Multi-tenant keys as JSON: `{key: {org, tier, rpm, daily_quota}}` |
| `REDIS_URL` | *(none)* | Optional Redis for global per-org rate limits and quotas across pods |
| `HAUL_SCAN_STORE` | `data/haul_scans.db` | SQLite path or `memory` for scan persistence |
| `HAUL_REQUEST_SIGNING_SECRET` | *(none)* | Optional HMAC-SHA256 signature secret for `/api/scan` |
| `HAUL_FEEDBACK_ENABLED` | `true` | Enable labeled feedback collection |
| `HAUL_SAVE_SCAN_IMAGES` | `true` | Save uploaded scan images for later review/training |
| `HAUL_FEEDBACK_DIR` | `data/feedback` | Directory for labeled feedback images |
| `HAUL_SCAN_IMAGES_DIR` | `data/scan_images` | Directory for uploaded scan images |
| `HAUL_LOG_JSON` | `false` | Emit structured JSON logs |
| `HAUL_CORS_ORIGINS` | `*` | Comma-separated allowed CORS origins |

`HAUL_API_KEYS` supports a JSON object keyed by key string, or a list of objects with a `key` field. Each entry sets `org`, `tier` (`free`/`pro`/`enterprise`), per-minute request limit (`rpm`), and daily scan quota (`daily_quota`).

Per-organization scan metadata (quotes, recovery values, detected entities) is persisted to `HAUL_SCAN_STORE` and exposed via `/api/scans`, `/api/usage`, and `/api/billing`. Scan images can be saved to `HAUL_SCAN_IMAGES_DIR` when `HAUL_SAVE_SCAN_IMAGES=true` so drivers/reviewers can later submit corrected labels via `POST /api/feedback`; these labeled photos export as YOLO/COCO datasets from `GET /api/feedback/export` for model fine-tuning.

### Training data bootstrap

To build an initial labeled photo database for training a hauling-specific detector, run the public-dataset importer. It downloads the COCO 2017 validation set, maps COCO categories to the hauling catalog (furniture, appliances, electronics, sporting goods, motor vehicles), and stores them as synthetic feedback records:

```bash
python scripts/build_training_db.py --max-per-class 100 --max-total 2000 --workers 8
```

- COCO: http://cocodataset.org/#home — 35 relevant categories including motorcycle, bicycle, sofa, chair, bed, dining table, potted plant, tv, laptop, refrigerator, microwave, backpack, suitcase, bottle, cup, vase, umbrella, skateboard, tennis racket, skis, snowboard, surfboard, etc.
- TACO: http://tacodataset.org/ — trash/waste annotations for debris/scrap/metal classes (can be added to the importer as a future source).
- Open Images V7: https://storage.googleapis.com/openimages/web/index.html — large-scale detection for 600 classes, useful for expanding coverage (FiftyOne/Voxel51 tooling).

After import, export a YOLO or COCO training set:

```bash
python scripts/build_training_db.py --export yolo --max-per-class 100 --max-total 2000 --workers 8
# or use the running API:
# GET /api/feedback/export?fmt=yolo&as_zip=true
```

### Verification

```bash
python -m pytest tests/test_photo_ai_haul.py -v
curl http://localhost:8000/healthz
curl http://localhost:8000/metrics
```

### Global deployment

A stateless container and Kubernetes manifests are provided for horizontal scaling:

- `Dockerfile.photo-ai-haul` — production container
- `docker-compose.yml` — local stack with Redis-backed rate limits
- `infra/kubernetes/photo-ai-haul-deployment.yaml` — 2+ replica Deployment
- `infra/kubernetes/photo-ai-haul-service.yaml` — ClusterIP service
- `infra/kubernetes/photo-ai-haul-hpa.yaml` — CPU/memory HorizontalPodAutoscaler (2-20 pods)
- `infra/kubernetes/photo-ai-haul-ingress.yaml` — TLS ingress for `photo-ai.alreadyherellc.com`

Deploy to Kubernetes:

```bash
kubectl apply -f infra/kubernetes/namespace.yaml
kubectl apply -f infra/kubernetes/photo-ai-haul-deployment.yaml
kubectl apply -f infra/kubernetes/photo-ai-haul-service.yaml
kubectl apply -f infra/kubernetes/photo-ai-haul-hpa.yaml
kubectl apply -f infra/kubernetes/photo-ai-haul-ingress.yaml
```

### Google Play app (Trusted Web Activity)

The PWA can be wrapped as an Android app and published on Google Play. A ready-to-build TWA project is in `android/photo-ai-haul-twa/`:

1. Deploy `app.py` to a public HTTPS domain.
2. Update `android/photo-ai-haul-twa/app/src/main/AndroidManifest.xml` and `res/values/strings.xml` with your domain.
3. Update `public/assetlinks.json` with your app package name and release keystore SHA-256 fingerprint.
4. Build the Play Store bundle:

```bash
cd android/photo-ai-haul-twa
./gradlew bundleRelease
```

5. Upload `app/build/outputs/bundle/release/app-release.aab` to Google Play Console.

See `android/photo-ai-haul-twa/README.md` for full instructions.

## Revenue Mesh v1

Revenue Mesh v1 converts each work-search cycle into one of five concrete revenue outcomes:

- same-day or next-day premium dispatch work
- stackable local cash backup work
- direct dispatch partner outreach targets
- productized AI automation offers
- task-replacement escalation when no income path survives scoring

Implemented surfaces:

- `lib/revenue-mesh.ts`: deterministic scoring engine, grade rules, daily-stack builder, backup-stack builder, productized offers, counter drafts, outreach drafts, approval-gate boundaries, and task-replacement recommendation logic.
- `app/api/revenue-mesh/route.ts`: rate-limited JSON endpoint for scoring current opportunities and selecting the best productized offer from prospect text.
- `app/revenue-mesh/page.tsx`: public-facing Revenue Mesh v1 offer page with operating economics, productized offers, approval safeguards, and conversion CTAs.
- `tests/revenue-mesh.test.mjs`: CI coverage for premium dispatch scoring, low-rate counter detection, revenue-system failure escalation, productized offer selection, API GET, and API POST.

Automation boundary: Revenue Mesh may find, rank, draft, prepare, score, and recommend. It does not accept work, send outreach, submit bids, sign agreements, move money, change credentials, or publish client-facing production claims without explicit approval.

## Level-4 Context Mesh integration

The production app now includes a concrete Level-4 resiliency layer instead of a concept-only architecture.

Implemented surfaces:

- `lib/level4-resiliency.ts`: in-process runtime store, event queue state, provider status, payload hashing, degraded mode, dead-letter state, deterministic fallback hooks, and test reset support.
- `app/api/runtime/status/route.ts`: runtime status endpoint with recent events, queue depth, provider configuration state, committed count, degraded events, and dead-letter count.
- `app/api/health/route.ts`: health endpoint with Level-4 mode and provider visibility.
- `lib/llm-gateway.ts`: LLM provider cascade through configured gateway, Groq, and Gemini with Level-4 degraded-event recording and deterministic fallback.
- `lib/dispatch-offline-queue.ts`: browser local-first dispatch queue for non-attachment submissions when the network/server is unavailable.
- `components/DispatchForm.tsx`: dispatch form automatically saves failed submissions locally and replays queued records on reconnect.
- `tests/level4-resiliency.test.mjs`: CI coverage for committed events, provider outage fallback, dead-letter behavior, form serialization, and runtime snapshot state.

Important limitation: browser offline queuing does not persist uploaded attachment bytes. File metadata is captured and the user is warned to reattach files after recovery. This avoids unsafe hidden file retention and browser storage failures.

## Finnhub WebSocket paper/shadow runtime

`runtime/finnhub_feed.py` provides a real-time paper/shadow market-data feed. It is not a live-money execution path.

Runtime order:

```text
Finnhub WebSocket -> Finnhub REST quote -> Yahoo fallback
```

Operational rules:

- Set `FINNHUB_API_KEY` only as a local environment variable, OCI environment variable, or GitHub Actions secret.
- Do not commit the Finnhub key to this repository.
- When `FINNHUB_API_KEY` is present, `runtime/paper_trader.py` automatically prefers `FinnhubRealtimeFeed`.
- When the key is absent, the paper trader falls back to Yahoo without breaking local proof runs.
- Treat all Finnhub-backed runs as paper/shadow proof-of-work unless a separate human-approved live-execution gate is built and enabled.

Local validation:

```bash
python -m pip install -r requirements.txt
python -m pytest tests/test_finnhub_feed.py
FINNHUB_API_KEY=local_key python runtime/paper_trader.py
```

Required proof markers for a valid Finnhub WebSocket paper test:

```text
source="finnhub_ws"
WebSocket connected
trades_received > 0
paper_trader using FinnhubRealtimeFeed
Yahoo fallback disabled during keyed run
live_order_execution=false
```

## Polymarket Smart Wallet Tracker & Alert Engine

`runtime/polymarket/` is a military-grade, fully autonomous tracker for Polymarket smart wallets on Polygon.

Components:

- `PolymarketListener` — resilient WebSocket + HTTP RPC log ingestion for `OrderFilled`, `OrdersMatched`, and ERC-1155 `Transfer` events across CTF Exchange V1/V2 and NegRisk exchange contracts.
- `WalletProfiler` — 30-day P&L, win-rate, Sharpe, and conviction scoring from The Graph / PolyNode / local state.
- `RiskGuard` — deterministic slippage cap, fixed order sizing, blacklisted markets, and cooldown controls.
- `SignalConfluence` — 90% win-rate style ensemble filter using live CLOB price history (momentum, mean reversion, Bollinger, support/resistance).
- `PortfolioRiskGuard` — portfolio-level circuit breaker with daily/weekly loss, drawdown, streak, and win-rate scaling rules.
- `WalkForwardBacktest` — realized P&L backtest over historical Goldsky fills using real closed-market settlements from the Polymarket CLOB.
- `TelegramAlertEngine` — sub-second Markdown alert dispatcher with circuit breaker and rate limiting.
- `PolymarketOrchestrator` — sovereign agent coordinator wiring listener, profiler, signal, portfolio, risk, and alert agents.

Agent declarations are in `agents/registry.yaml` under `polymarket-*`. The system is alert-only by default; live copy-execution requires explicit `POLYMARKET_LIVE_EXECUTION=true` plus human approval per the risk gate.

Local validation:

```bash
python -m pip install -r requirements.txt
python -m pytest tests/test_polymarket_tracker.py
python runtime/polymarket/orchestrator.py
python runtime/polymarket/backtest.py --wallets 0x... --start 1770000000 --end 1785634560
```

API surface:

```bash
curl http://localhost:3000/api/polymarket-tracker/status
```

## Environment variables

Production secrets are configured as encrypted hosting/Vercel, GitHub Actions, or OCI environment variables and must not be committed to this repository.

Required operational variables by surface:

- public site URL for canonical metadata
- Resend delivery key and dispatch routing emails for lead/dispatch delivery
- Formspree endpoint only when Resend delivery is not active
- LLM gateway/provider keys only for configured provider routes
- ProfitEngine URL and webhook token only when the ProfitEngine handoff is active
- Finnhub API key only for paper/shadow WebSocket market-data proof runs
- Polygon RPC / Alchemy WebSocket and Telegram credentials only when the Polymarket tracker is active

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run test
python -m pytest tests/test_finnhub_feed.py
python -m pytest tests/test_photo_ai_haul.py
```

Runtime verification endpoints:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/runtime/status
curl http://localhost:3000/api/revenue-mesh
curl http://localhost:3000/api/polymarket-tracker/status
curl http://localhost:8000/healthz
```

## Deployment notes

### Git-based Vercel deployment

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add production environment variables in Vercel project settings.
4. Deploy.
5. Confirm `/api/health`, `/api/runtime/status`, `/api/revenue-mesh`, `/api/polymarket-tracker/status`, and (on the Python runtime) `/healthz` return valid JSON.

### Vercel CLI deployment

```bash
npm i -g vercel
vercel --prod
```

## Production QA

- Confirm homepage loads on desktop and mobile.
- Confirm Phoenix-based and Commercially Insured are visible high on the page.
- Confirm Request Dispatch and Send Scope CTAs are visible quickly.
- Confirm the dispatch form submits successfully with Resend or Formspree configured.
- Confirm a forced dispatch API outage queues the form locally and replays when connectivity returns.
- Confirm uploaded PDF/JPG/PNG files are accepted while online.
- Confirm offline attachment submissions display the reattachment warning.
- Confirm `/api/health` reports Level-4 mode, provider status, queue depth, and dead-letter count.
- Confirm `/api/revenue-mesh` reports productized offers, task-replacement escalation, and approval-gate boundaries.
- Confirm `/revenue-mesh` loads on desktop and mobile.
- Confirm Finnhub paper/shadow runtime reports `source="finnhub_ws"` only when `FINNHUB_API_KEY` is set.
- Confirm no live-money trading path is enabled by the Finnhub runtime.
- Confirm `/api/polymarket-tracker/status` reports alert-only mode, watched wallets, and risk guardrails.
- Confirm no live-money Polymarket copy-trading path is enabled unless `POLYMARKET_LIVE_EXECUTION=true` and human approval is recorded.
- Confirm `python -m pytest tests/test_photo_ai_haul.py` passes and `/healthz` and `/api/scan` return valid responses.
- Confirm no prohibited claims remain in public copy.

## Form processing

The contact form posts to `/api/dispatch`, validates required fields, and delivers through Resend when configured or Formspree as fallback. If the browser cannot reach the dispatch endpoint, non-attachment form fields are queued locally and replayed when the browser comes back online.
