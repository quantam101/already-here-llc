---
name: testing-referral-partner
description: End-to-end testing workflow for the referral/partner engine and Stripe/OCI health endpoints in the already-here-llc Next.js site.
---

# Testing referral/partner + live-services health

Use this skill after changing `lib/referral.ts`, the partner/referral API routes, Stripe checkout/webhook routes, or `app/api/health/live-services`.

## Local environment

```bash
export PATH=/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
CANONICAL_STORE_TYPE=memory NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run dev
```

`CANONICAL_STORE_TYPE=memory` keeps tests from writing referral/partner state to `data/canonical-graph.db`. `NEXT_PUBLIC_SITE_URL` makes generated shareable links point at the dev server.

For live Stripe checkout or OCI health checks, also set:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OCI_CANONICAL_URL`
- `OCI_CANONICAL_API_KEY`

Without these, the unconfigured paths (`not_configured` / 503) are the expected behavior.

## Quality gates

```bash
export PATH=/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
npm run lint
npx tsc --noEmit
npm run build
npm run test:referral-partner
npm run test:stripe
```

## Browser test flow

1. Start the dev server with the command above.
2. Navigate to `/partner-with-us`.
3. Submit the partner signup form.
4. Assert the success state shows `Application received` and a referral code in `AH-XXXXXX` format.
5. Navigate to `/dashboard/referrals`.
6. Enter an email and click `Get my referral code`.
7. Assert the page displays the code, a shareable link like `http://localhost:3000/?ref=AH-XXXXXX`, and `0` conversions.
8. Click `Copy link`. The button calls `navigator.clipboard.writeText(stats.link)`. In a headed browser you can paste it into the address bar or an input. In the headless test environment clipboard readback is unavailable, so rely on the displayed link text.
9. POST to `http://localhost:3000/api/referrals/convert` with a body like:

   ```json
   {
     "code": "AH-XXXXXX",
     "sourceId": "rev_test_123",
     "revenueCents": 20000,
     "rewardCents": 2500
   }
   ```

10. Reload `/dashboard/referrals` and assert the activity cards show the updated conversion count, revenue, and rewards.

## API probes

- `POST /api/partners` with `{ name, company, type, contactEmail }` returns `{ ok, partnerId, referralCode }`.
- `POST /api/referrals` with `{ email }` returns `{ ok, code, stats, created }`.
- `GET /api/referrals?email=...` returns `{ ok, code, stats }`.
- `POST /api/referrals/convert` with `{ code, sourceId, revenueCents, rewardCents }` returns `{ ok, conversionId, referralCode, revenueCents, rewardCents }`.
- `GET /api/health/live-services` returns `{ ok, timestamp, services[], stripe: { mode, last4 }, publishableKeySet, ociConfigured }`.
- `POST /api/stripe/checkout` returns `{ url, sessionId }` when `STRIPE_SECRET_KEY` is set; otherwise returns HTTP 503 with `Stripe is not configured...`.

## Known quirks

- The `computer` tool `type` action may not reliably send the `@` character into an email input. If typing an email address, type the local part, then use a separate `key` action for `@`, then `type` the domain, or paste from the clipboard.
- Headless Chrome does not expose a readable clipboard, so the `Copy link` button can only be verified by checking the displayed link text, not by reading the system clipboard.
- Partner and referral code routes are public and unauthenticated. Tests should exercise the success paths and the expected unconfigured health responses; do not attempt to test authentication flows that do not exist.
