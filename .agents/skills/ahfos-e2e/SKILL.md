---
name: ahfos-e2e
description: End-to-end testing of the AHFOS v1.0 intake-to-closeout scaffold (portal, dispatch board, technician jobs, agents).
---

## AHFOS v1.0 E2E testing notes

### Local dev setup for AHFOS workflows

- AHFOS uses a separate Next.js app under `/app/api/ahfos` and pages under `/portal`, `/dispatch-board`, `/technician/jobs`.
- Start `npm run dev` from repo root.
- Create a temporary `.env.local` with at least:
  ```bash
  AHFOS_SESSION_SECRET=<random 64-char hex>
  AHFOS_BOOTSTRAP_TOKEN=<from tests/e2e-credentials.json or a new secret>
  AHFOS_DATA_DIR=/tmp/ahfos
  NODE_ENV=development
  ```
- Using `NODE_ENV=development` avoids the `Secure` cookie flag, which is required for automated browser navigation because `SameSite=Strict` + `Secure` cookies are not sent on `http://localhost` top-level navigations.
- Data persists as JSONL files under `AHFOS_DATA_DIR`. Delete `/tmp/ahfos` before a clean run.

### Seeding users

1. Create admin via the bootstrap route (once per empty data dir):
   ```bash
   curl -s -X POST -H 'Content-Type: application/json' \
     -d '{"token":"<AHFOS_BOOTSTRAP_TOKEN>","email":"admin+e2e@example.invalid","password":"E2eAdmin123!","name":"E2E Admin"}' \
     http://localhost:3000/api/ahfos/auth/setup
   ```
2. Log in as admin and create a technician via `POST /api/ahfos/users` with `roles: ['technician']` and matching skills/trade.

### Authenticating in the browser

- The session cookie is `ahfos_session`, `HttpOnly`, `SameSite=Strict`. For local dev it is not `Secure`.
- If cookies expire between role switches, re-authenticate by `fetch` to `/api/ahfos/auth/login` with `credentials: 'include'`, then `window.location.href = '/<page>'`.
- Vercel previews set `Secure; SameSite=Strict` cookies. In the current automation environment top-level navigations in the preview do not carry the cookie and protected pages redirect to `/portal/login`. The preview API routes work with `fetch`/`curl`, so smoke-test them separately.

### Filling React-controlled forms

- `browser_console` value assignment alone does **not** update React state for controlled inputs. If you must set values programmatically, use the native input value setter and dispatch `input`/`change` events:
  ```js
  function setNativeValue(el, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  setNativeValue(input, 'Phoenix');
  ```
- Form typing via `computer` is unreliable for these controlled components; fallback to the API when the UI path is blocked.

### Key API endpoints for state transitions

- `POST /api/ahfos/auth/register` — customer registration (sets session cookie).
- `POST /api/ahfos/jobs` — create service request / intake.
- `POST /api/ahfos/jobs/:id/agent` with agents:
  - `dispatch` — auto-assign (needs `payload` with technician constraints or uses default).
  - `closeout` — mark completed, set invoice/review pending, capture signature.
  - `invoice` — set `invoice.status` to `sent`.
  - `review` — set `review.status` to `sent`.
  - `kb` — create knowledge entry and set `job.kbEntryId`.
- `GET /api/ahfos/jobs/:id` — verify final state.

### Common gotchas

- The intake form urgency `<select>` value for "Same day" is `same-day`, but the intake agent `inferPriority` looks for the phrase `same day` with a space. The `down`/`outage` keywords still produce `emergency` priority.
- `DispatcherBoard` only exposes UI buttons for `Auto-assign`, `Build checklist`, and `Send invoice`. `review` and `kb` agents must be triggered via API (or the UI needs to be extended).
- Vercel preview users may not exist on first run; use `/api/ahfos/auth/setup` with the bootstrap token to seed them, then smoke-test login and `/api/ahfos/jobs`.

### Devin Secrets Needed

- `tests/e2e-credentials.json` (admin/technician/bootstrap-token; do not commit).
- `.env.test` or `.env.local` values for `AHFOS_SESSION_SECRET` and `AHFOS_BOOTSTRAP_TOKEN` when running locally.
