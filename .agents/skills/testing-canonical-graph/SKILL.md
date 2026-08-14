---
name: testing-canonical-graph
description: End-to-end test workflow for the canonical business graph, IDs, revenue-spine persistence, and review/AI ledgers in already-here-llc.
---

# Testing the Canonical Business Graph

Use this skill when PRs touch `lib/canonical-ids.ts`, `lib/canonical-store.ts`, `lib/revenue-command-agents.ts`, `lib/revenue-command-spine.ts`, `lib/revenue-command-intake.ts`, or the routes under `app/api/revenue-command-spine/` and `app/api/dispatch/`.

## Local setup

1. Ensure Node 22 is first in `PATH`:
   ```bash
   export PATH=/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
   ```
2. `npm install` and `pip install -r requirements.txt` (standard repo maintenance).
3. SQLite testing requires Node 22 and the experimental built-in `node:sqlite` module:
   ```bash
   export CANONICAL_STORE_TYPE=sqlite
   export CANONICAL_SQLITE_PATH=.tmp/canonical-graph-test.db
   node --experimental-sqlite --experimental-strip-types --import ./tests/register-next-alias.mjs .tmp/e2e-canonical.mjs
   ```
4. Start the dev server:
   ```bash
   npm run dev   # http://localhost:3000
   ```

## Vercel preview URL

The preview URL is embedded in the base64 payload of the `vercel[bot]` PR comment.
Decode the payload or read `previewUrl` from it. Example for PR #145:
`https://already-here-llc-git-devin-1-ab5630-already-here-llc-s-projects.vercel.app`.

## Key routes and expected behavior

- `GET /api/revenue-command-spine` returns `records`, `agents`, and `agentCoverage`. It must **not** write to the canonical store.
- `POST /api/revenue-command-spine/intake` returns a `RevenueIntakeProof` with `databaseReadyWrites` and `writeResult`.
- `POST /api/revenue-command-spine` with `{"recordId": "...", "action": "pass"}` returns `reviewId` and records it in the `reviews` table.
- `POST /api/dispatch` returns `dispatchId` and `revenueSpine`. Use `?mode=local-proof` to guarantee `delivery: "local_proof_only"` and avoid accidental Resend/Formspree calls on previews that have those env vars set.

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

## SQLite backend note

`lib/canonical-store.ts` now prefers the Node 22 built-in `node:sqlite` module (when available, enabled with `--experimental-sqlite`) and falls back to `better-sqlite3` loaded via `process.getBuiltinModule('node:module').createRequire`. If neither driver works, the store falls back to the memory backend. The memory backend remains the default and is Vercel-safe (`process.env.VERCEL` disables SQLite).

## Devin secrets needed

- `GITHUB_TOKEN` — to read PR details and Vercel-bot comments.
- `VERCEL_TOKEN` — only if you need to query deployments directly.
