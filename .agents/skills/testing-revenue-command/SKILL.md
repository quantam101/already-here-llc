---
name: testing-revenue-command
description: How to end-to-end test the Revenue Command Spine (owned DB intake, pipeline, engineering, security) for already-here-llc.
---

# Testing the Revenue Command Spine

## Local dev setup

1. Use Node 22 and run from the repo root:
   ```bash
   export PATH=/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
   REVENUE_COMMAND_DB_PATH=/tmp/revenue-command.json npm run dev
   ```
2. The default `data/revenue-command.json` under `process.cwd()` works on a laptop but **fails on Vercel** (`/var/task` is not writable). When `VERCEL` or `VERCEL_ENV` is set, the code now falls back to `/tmp/revenue-command.json` automatically, but you can still override it with `REVENUE_COMMAND_DB_PATH`.

## Golden-path smoke tests

### Vercel preview

Use the latest preview URL from the Vercel API or CLI for the PR commit.

1. **Dispatch form** — `https://<preview>/dispatch`
   - Submit all required fields; expect redirect to `/thank-you`.
   - Verify `GET /api/revenue-command-spine/data?table=opportunities` returns a record with `lane: Dispatch`.
   - The preview uses RESEND when `RESEND_API_KEY` and `DISPATCH_TO_EMAIL` are set; the owned DB is persisted before the email is sent.

2. **Revenue dashboard** — `https://<preview>/revenue-command`
   - Confirm owned opportunities load.
   - Select a pipeline action (`quote`, `schedule`, etc.) and click `Apply`.
   - Confirm the status banner and stage-count panel update.

3. **Direct API intake** — `POST /api/revenue-command-spine/intake`
   - Expect `persistedToOwnedDatabase` > 0 and `persistenceErrors` empty.
   - Sample body:
     ```json
     {
       "fullName": "Smoke Test",
       "company": "SmokeCo",
       "email": "smoke@example.invalid",
       "title": "Urgent same-day dispatch revenue opportunity by noon $500",
       "body": "Network smart hands dispatch proof request.",
       "location": "Phoenix, AZ",
       "serviceType": "Technical field operations",
       "estimatedValueCents": 50000
     }
     ```

4. **Engineering & Security APIs**
   - `POST /api/revenue-command-spine/engineering` with `"type": "codex" | "health" | "catch_correct"`.
   - `POST /api/revenue-command-spine/security` with `"type": "finding" | "assign_role"`.
   - Verify with `GET /api/revenue-command-spine/data?table=<table>`.

5. **AI receptionist status** — `GET /api/ai-receptionist/status`
   - Check `ownedRecordCounts` increases after intake.

## Vercel preview gotchas

- **`.gitignore` vs route directories:** `.gitignore` contained `data/`, which ignored `app/api/revenue-command-spine/data/` recursively. The fix is anchoring it as `/data/`. Verify with `git ls-tree HEAD --name-only | grep revenue-command-spine/data`.
- **Writable DB path on Vercel:** `lib/revenue-command-db.ts` now defaults to `/tmp/revenue-command.json` when `VERCEL` or `VERCEL_ENV` is set, so owned writes no longer fail with `ENOENT: no such file or directory, mkdir '/var/task/data'`. You can still override with `REVENUE_COMMAND_DB_PATH`.
- **Dispatch form persistence:** `app/api/dispatch/route.ts` must call `persistDatabaseReadyWrites(revenueSpine.databaseReadyWrites)` and return `persistedToOwnedDatabase` / `persistenceErrors`.
- **Vercel feedback widget can steal focus:** Vercel preview deployments render a floating feedback button on the right edge. When automating the UI with keyboard-only interactions, `Tab`/`Return` can focus the feedback button and open a Vercel login page. Use direct mouse clicks or `document.querySelector` in the browser console when this happens.

## Devin secrets needed

- `VERCEL_TOKEN` — to inspect/preview Vercel deployments and environment variables.
- `GITHUB_TOKEN` — to read PR metadata and comments.
