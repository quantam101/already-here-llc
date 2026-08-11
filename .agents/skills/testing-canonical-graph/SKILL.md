---
name: testing-canonical-graph
description: End-to-end test workflow for the canonical business graph, IDs, revenue-spine persistence, and review/AI ledgers in already-here-llc.
---

# Testing the Canonical Business Graph

Use this skill when PRs touch `lib/canonical-ids.ts`, `lib/canonical-store.ts`, `lib/revenue-command-agents.ts`, `lib/revenue-command-spine.ts`, `lib/revenue-command-intake.ts`, `lib/revenue-os-seed.ts`, `lib/route-stack.ts`, `lib/codex.ts`, `lib/system-health.ts`, `lib/ahfos-qa.ts`, `runtime/photo_ai_booking.py`, `runtime/photo_ai_haul.py`, or the routes under `app/api/revenue-command-spine/`, `app/api/dispatch/`, `app/api/codex/`, `app/api/route-stack/`, `app/api/health/telemetry/`, `app/api/enterprise/qa/`, and `runtime/app.py`.

## Local setup

1. Ensure Node 22 binaries are first in `PATH`:
   ```bash
   export PATH=/home/ubuntu/.local/node22/bin:/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
   ```
   The `/home/ubuntu/.local/node22/bin` path contains the Node 22 binary; `npm` comes from the nvm path, so both must be present.
2. `npm install` and `pip install -r requirements.txt` (standard repo maintenance).
3. SQLite testing requires Node 22 and the experimental built-in `node:sqlite` module:
   ```bash
   export CANONICAL_STORE_TYPE=sqlite
   export CANONICAL_SQLITE_PATH=.tmp/canonical-graph-test.db
   node --experimental-sqlite --experimental-strip-types --import ./tests/register-next-alias.mjs .tmp/e2e-canonical.mjs
   ```
   `next dev` does **not** pass `--experimental-sqlite` by default, so the dev server falls back to the memory backend. For SQLite persistence during route-level tests, run route handlers directly from a Node script with the flag, or start the dev server with `NODE_OPTIONS='--experimental-sqlite' npm run dev`.
4. Start the dev server (memory store by default):
   ```bash
   export AHFOS_INTERNAL_API_KEY=test   # local-only value; never commit
   npm run dev   # http://localhost:3000
   ```
   Internal routes such as `/api/codex` and `/api/enterprise/qa` require the `x-internal-api-key` header to match `AHFOS_INTERNAL_API_KEY`.

## Vercel preview URL

The preview URL is embedded in the base64 payload of the `vercel[bot]` PR comment.
Decode the payload or read `previewUrl` from it. Example for PR #145:
`https://already-here-llc-git-devin-1-ab5630-already-here-llc-s-projects.vercel.app`.

## Key routes and expected behavior

- `GET /api/revenue-command-spine` returns `records`, `agents`, and `agentCoverage`. It must **not** write to the canonical store.
- `POST /api/revenue-command-spine/intake` returns a `RevenueIntakeProof` with `databaseReadyWrites` and `writeResult`.
- `POST /api/revenue-command-spine` with `{"recordId": "...", "action": "pass"}` returns `reviewId` and records it in the `reviews` table.
- `GET /api/health/telemetry` returns `ok`, `oci` status, and the latest `system_health_signals`.
- `POST /api/codex` (with `x-internal-api-key`) records a changelog event and returns `{ ok: true, id }`.
- `POST /api/codex` with `type: catch-correct` records a catch/correct event and returns `{ ok: true, id }`.
- `GET /api/codex` returns `codexEvents` and `catchCorrectEvents` arrays.
- `POST /api/route-stack` returns `{ ok: true, plan }` with `plan.sequence`, `totalDistanceMiles`, `totalContributionMargin`, `totalRevenue`, `totalCost`, `totalDurationMinutes`, `windowViolations`, and `feasibilityScore`.
- `POST /api/enterprise/qa` (with `x-internal-api-key`) returns a full QA packet built from the canonical store for a given `contactId` or `opportunityId`.
- `POST /api/dispatch` returns `dispatchId` and `revenueSpine`. Use `?mode=local-proof` to guarantee `delivery: "local_proof_only"` and avoid accidental Resend/Formspree calls on previews that have those env vars set.
- `runtime/app.py` exposes `/api/scan` and `/api/book`. Use `/healthz` to confirm the scanner is ready before uploading.
- `/` (port 8000) is the PWA booking form: upload a photo, review the quote, fill the booking form, and click `ACCEPT & BOOK LOAD`.

## Canonical store assertions

Because the app does not expose a public query endpoint for the canonical store, run a Node script that imports the route handlers and `getCanonicalStore`/`resetCanonicalStore`:

```bash
node --experimental-strip-types --import ./tests/register-next-alias.mjs .tmp/e2e-canonical.mjs
```

The script should:
1. `resetCanonicalStore()`.
2. Call the `GET` handler and assert `getCanonicalStore().queryAll().length === 0`.
3. Call the intake `POST` handler, capture `databaseReadyWrites`, and assert `getCanonicalStore().getRecord('leads', leadId)` exists.
4. Call the review `POST` handler and assert `getCanonicalStore().getRecord('reviews', reviewId)` exists.
5. Call the dispatch `POST` handler and assert a `leads` record is stored.
6. Call `getRevenueCommandAgents({ persist: true })` and assert `ai_runs` table count equals `getDatabaseReadyRecords().length`.
7. Run `scripts/seed-revenue-os.mjs` and assert `opportunities` count equals the number of records in `data/revenue-pipeline.json`.
8. Exercise `POST /api/route-stack` with a valid stops/vehicle payload and assert `plan.feasibilityScore > 0`.

## Photo-to-Quote Hauling closed loop

```bash
GMAOS_MODE=strict_zero_spend GMAOS_PAID_ADAPTERS_ENABLED=false \
  GMAOS_AUDIT_LOG=/tmp/audit.jsonl HAUL_SCANNER_PORT=8000 \
  HAUL_VISION_SOURCE_ORDER=deterministic HAUL_YOLO_ENABLED=false HAUL_CLIP_ENABLED=false \
  python3 app.py
```

Then:
```bash
curl -s http://localhost:8000/healthz
curl -s -F 'file=@/tmp/test_load.jpg' http://localhost:8000/api/scan
curl -s -X POST http://localhost:8000/api/book -H 'Content-Type: application/json' -d '{"scan": <scan-json>, "customer": {...}}'
```

A successful booking returns `ok: true`, `booking_id` (starts with `opp_`), `canonical_ids` with 14+ keys, `record_count >= 14`, and a non-empty `feedback_id`.

## SQLite backend note

`lib/canonical-store.ts` now prefers the Node 22 built-in `node:sqlite` module (when available, enabled with `--experimental-sqlite`) and falls back to `better-sqlite3` loaded via `process.getBuiltinModule('node:module').createRequire`. If neither driver works, the store falls back to the memory backend. The memory backend remains the default and is Vercel-safe (`process.env.VERCEL` disables SQLite). Use `--experimental-sqlite` for SQLite route-level tests; without it the store defaults to memory.

## Devin secrets needed

- `GITHUB_TOKEN` — to read PR details and Vercel-bot comments.
- `VERCEL_TOKEN` — only if you need to query deployments directly.
