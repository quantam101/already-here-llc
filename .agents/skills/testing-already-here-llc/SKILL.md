---
name: testing-already-here-llc
description: Test the already-here-llc Next.js + Python GMAOS site end-to-end. Use when verifying UI changes, runtime refactors, or content guard compliance.
---

## Quality Gate (Shell Tests)

Run all checks from repo root:

```bash
npx eslint .                           # ESLint
npx tsc --noEmit                       # TypeScript typecheck
npm run build                          # Next.js build
node scripts/a-plus-content-guard.mjs  # Content guard (must show 0 findings)
python -m pytest tests/ -v             # Python runtime tests (expect 3/3)
```

All must exit 0 with no errors.

## Content Guard

- The content guard (`scripts/a-plus-content-guard.mjs`) scans for forbidden SDVOSB language patterns
- `skipFiles` in the script excludes meta files (agent defs, scripts, docs) from scanning
- If content guard fails, check for: "SDVOSB-certified", "set-aside", "sole-source" in buyer-facing content
- Use "SDVOSB Eligible" or "Certification Pursuit In Progress" instead

## Browser Testing

Use the Vercel preview URL from the PR (check `git_view_pr` comments for the URL).

Key pages to verify:
1. `/blog/<slug>` — Markdown rendered as HTML (h2 tags in DOM, no literal `##` text)
2. `/blog` — Blog listing with titles, excerpts, categories
3. `/` — Homepage with branding, nav, trust bar, service cards
4. `/capability-statement` — Must show "Certification Pursuit In Progress", NOT "SDVOSB Certified"
5. `/dispatch` — Dispatch form with all fields
6. `/command-center/agents` — GMAOS scaffold JSON renders

## Blog Markdown Rendering

- Blog posts use `remark` + `remark-html` for server-side markdown-to-HTML conversion
- The `prose` Tailwind class with `text-sm` makes h2 headings render at body text size — this is a styling choice, not a bug
- To verify h2 tags: use `curl` on the page URL and search for `<h2>` in the response
- The `sanitize: true` option on remark-html strips unsafe HTML (script tags, etc.)

## Python Runtime

- `runtime/health_server.py` is the K8s container entrypoint (not `sovereign_core.py`)
- Verify imports: `python -c "from runtime.health_server import HealthHandler, main; print('ok')"`
- The health server exposes `/healthz`, `/readyz`, `/metrics` on port 8080

## Revenue Command Intake (dispatch form spine)

- The dispatch form POSTs to `/api/dispatch`. With no `RESEND_API_KEY`/`FORMSPREE_ENDPOINT` set (typical local dev), it automatically returns a local-proof JSON response and the UI redirects to `/thank-you`.
- To verify intake lane/priority/score without email providers, POST the same fields to `http://localhost:3000/api/dispatch?mode=local-proof` (or send header `x-ah-local-proof: true`) and inspect `revenueSpine.lane/priority/score` in the JSON.
- Priority semantics: P0 requires an urgency term (`urgent`, `today`, `same-day`, `by noon`, `asap`) in title/body/serviceType/requestedWindow AND score >= 85; score >= 55 is P1; else P2. `requestedWindow` matching is case-insensitive.
- Useful probe cases: non-urgent "$500 dispatch revenue opportunity" with Dispatch-lane serviceType → P1 (score 90); same + requestedWindow "Today by Noon" → P0 (120); generic inquiry → P2 (20).
- `npm run test` runs 9 suites including `tests/revenue-command-intake.test.mjs`, which is the spec for this scoring — do not edit tests to make them pass.

## Common Gotchas

- The favicon might return 404 on Vercel preview — this is pre-existing and unrelated to code changes
- The `validate` CI check may fail if content guard finds violations — fix the content, not the script
- `next-env.d.ts` is auto-generated — exclude it from ESLint via `eslint.config.mjs`
- K8s manifests reference images that don't exist yet (`ghcr.io/quantam101/already-here-llc-web:latest`) — these are scaffolds

## Marketplace / Scooter / Connect / Dashboard Testing

- New pages added by recent PRs: `/marketplace`, `/fleet-marketplace`, `/connect`, `/dashboard`, `/scooter-rentals`, `/scooter-rentals/terms`.
- `/fleet-marketplace` server-redirects to `/marketplace` via `redirect('/marketplace')`.
- `/marketplace` uses `<FleetMarketplaceListings>` for keyword/category/status filtering and `<MobilityMarketplaceForm>` for intake; the form POSTs to `/api/mobility` and returns `mobilityId` like `MOB-...`.
- `/scooter-rentals` form reads `?ref=AH-XXXXXX` from `useSearchParams`, validates against `/^AH-[A-Z0-9]{6}$/`, and pre-fills `referralCode`. Invalid refs are ignored.
- `/connect` uses `<ConnectMatchForm>` and POSTs to `/api/connect`.
- `/dashboard` is a static preview with links to `/marketplace`, `/scooter-rentals`, `/connect`, `/dashboard/referrals`, `/dashboard/payments`.
- A fixed bottom "Need a Phoenix technician today?" CTA can obscure form fields on long pages; hide it for testing with a one-time `display: none` via the browser console.
- The automation keyboard/mouse sometimes cannot reliably fill long forms or hit small targets; falling back to `browser_console` to set `.value`/`.checked` and trigger `.click()` is acceptable for proving end-to-end behavior.

## Vercel Preview URL

- Vercel bot comments are base64-encoded payloads. Extract the preview URL with:
  ```bash
  gh api repos/quantam101/already-here-llc/issues/<PR>/comments \
    --jq '.[] | select(.user.login == "vercel[bot]") | .body' | \
    sed 's/.*#\(.*\)=:.*/\1/' | base64 -d | python3 -m json.tool
  ```
- Alternatively, the comment body also contains a markdown `[Preview](...)` link.

## Devin Secrets Needed

- No secrets are required for UI testing; `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, and `TWILIO_*` keys are not needed for form success responses.

## Dependencies

- Node.js packages: `npm install` (includes zod, remark, remark-html)
- Python packages: `pip install pyyaml pytest`
