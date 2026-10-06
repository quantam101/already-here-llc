# Photo-to-Quote Hauling Agent — Sales Brief

Status: preparation authorized; external sales submission not authorized.

## 30-Second Pitch

The Photo-to-Quote Hauling Agent turns a smartphone photo of any load — junk, furniture, debris, equipment — into an instant, defensible quote with trailer-fill percentage, itemized recovery value, and a driver pickup manifest. It is built on the same AVAX-3D Photo AI Haul Scanner already running in the Already Here LLC hauling intake/proof-of-work pipeline, so the core model, inference stack, and field workflow are proven before a customer-specific engagement starts.

## Target Buyers

- Junk-removal and hauling owner-operators
- Moving / estate cleanout companies
- Municipal waste and bulky-item pickup programs
- Salvage yards and scrap-metal buyers
- Freight brokers and LTL resellers who quote from photos
- Field-service marketplaces that need vendor-neutral load sizing

## Problem

Hauling quotes today rely on phone descriptions, on-site visits, or customer self-estimates. That creates:

- Underbidding on dense or high-labor loads
- Overbidding and lost jobs on straightforward loads
- Dispatchers wasting time on photos sent over text
- No record of what was actually hauled for billing disputes
- Missed recovery value (scrap metal, resale, refurb) buried in the load

## Solution

A white-label, FastAPI-backed PWA that runs on any smartphone browser.

1. Driver or customer snaps a load photo.
2. Fine-tuned YOLOv8 ONNX detector identifies 35 hauling-specific object classes.
3. TinyCLIP zero-shot classification labels unusual items (scooter, pool table, helmet, etc.).
4. Volumetric agent estimates true cubic-yard fill using camera geometry and catalog dimensions.
5. Asset-recovery agent values resale/scrap/refurb potential against live or cached market feeds.
6. System returns a net quote, trailer fill %, and itemized driver manifest in seconds.

## Key Product Specs

| Capability | Detail |
|---|---|
| Object detector | Fine-tuned YOLOv8n ONNX, 442 training images, 35 classes |
| Validation metrics | mAP50 = 0.409, mAP50-95 = 0.317 |
| Fine-grained labels | TinyCLIP 40M ONNX zero-shot classification |
| Small-object handling | Multi-scale tiling (`HAUL_YOLO_TILE_GRID`, `HAUL_YOLO_TILE_OVERLAP`) |
| Runtime | ONNX Runtime CPU, zero paid-API spend by default |
| Fallback | Deterministic segmentation if no trained model is available |
| Interface | Mobile PWA with PWA manifest and Trusted Web Activity (TWA) Android wrapper |
| API | `POST /api/scan` (multipart), `/api/usage`, `/api/billing`, `/api/feedback`, `/healthz`, `/readyz`, `/metrics` |
| Enterprise | Multi-tenant API keys, rate limits, per-org persistence, Redis global quotas, HMAC-signed webhooks |
| Deployment | Docker, `docker-compose`, Kubernetes HPA + Ingress, Vercel preview integration |

## Why This Is a Low-Cost Resell

The Photo-to-Quote Agent is not a new build. It reuses the same inference engine, catalog schema, and feedback loop Already Here LLC already operates for its own hauling intake and proof-of-work system:

- Same `runtime/photo_ai_haul.py` vision pipeline
- Same `models/yolov8n-haul.onnx` and `models/yolov8n.onnx` artifacts
- Same `app.py` FastAPI service and `/api/scan` contract
- Same `POST /api/feedback` training-data flywheel
- Same Docker/Kubernetes packaging

That means implementation cost for a new customer is configuration and branding, not model training or architecture work.

## Commercial Offer (Draft — Approval Required)

| Tier | What's Included | Suggested Price |
|---|---|---|
| **Starter** | White-labeled PWA, up to 500 scans/mo, shared hosting, email support | $299/mo |
| **Growth** | Branded domain + Android TWA, up to 5,000 scans/mo, per-org analytics, feedback export, onboarding | $799/mo |
| **Enterprise** | Self-hosted or dedicated Kubernetes, unlimited scans, custom catalog classes, SLA, API access, HMAC webhooks | $2,499/mo + $4,999 setup |
| **Implementation** | Customer catalog tuning, field-test pilot, driver training, quote-rule calibration | $3,500–$8,500 one-time |

All prices are placeholders pending Stephen's approval and target-customer validation.

## ROI Story

- **Quote speed**: from hours (phone + on-site) to <2 seconds per photo.
- **Quote accuracy**: reduces underbidding by surfacing dense items and recovery value before the truck arrives.
- **Dispatcher load**: photos auto-triaged; only exceptions need human review.
- **Dispute protection**: immutable scan record with detected items, dimensions, and quote formula.
- **Revenue upside**: recovery credits are surfaced at intake, not discovered at the landfill.

## Deployment Options

1. **SaaS multi-tenant**: Already Here LLC hosts; customer gets a branded sub-domain.
2. **Customer self-hosted**: Docker Compose or Kubernetes on their own cloud or bare metal.
3. **Embedded API**: Customer's existing dispatch app calls `POST /api/scan` and renders the quote.

## Evidence Needed Before External Sales

- [ ] Sanitized screenshots of mobile PWA scan flow
- [ ] Sample `/api/scan` JSON quote output
- [ ] Demo video showing real-device photo → quote
- [ ] Edge-case test results (low light, cluttered load, no trained object present)
- [ ] Pricing approval from Stephen
- [ ] Capability statement and data-processing addendum
- [ ] Privacy and opt-in consent language

## Disclosure

This is an internal sales-enablement draft. No guaranteed revenue, savings, legal protection, certification, endorsement, or partner status is implied. All customer-facing claims must be approved before publication.
