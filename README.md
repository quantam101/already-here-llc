# Already Here LLC website

Lean multi-page B2B field-service website for Already Here LLC, built with Next.js App Router, TypeScript, and Tailwind CSS.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Level-4 resilient runtime layer for dispatch, health, runtime visibility, and LLM provider degradation

## Pages

- Home
- Services
- Who We Serve
- Contact / Dispatch
- Privacy Policy
- Thank You

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

## Environment variables

Copy `.env.example` to `.env.local` and set the following values for production-equivalent local testing:

```bash
NEXT_PUBLIC_SITE_URL=https://www.alreadyherellc.com
RESEND_API_KEY=
DISPATCH_FROM_EMAIL=dispatch@alreadyherellc.com
DISPATCH_TO_EMAIL=alreadyherellc@gmail.com
FORMSPREE_ENDPOINT=
GATEWAY_URL=
LITELLM_MASTER_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
PROFITENGINE_URL=
PROFITENGINE_WEBHOOK_TOKEN=
```

Real secrets must be configured as encrypted hosting/Vercel environment variables. They must not be committed to this repository.

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
```

Runtime verification endpoints:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/runtime/status
```

## Deployment notes

### Git-based Vercel deployment

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add production environment variables in Vercel project settings.
4. Deploy.
5. Confirm `/api/health` and `/api/runtime/status` return valid JSON.

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
- Confirm no prohibited claims remain in public copy.

## Form processing

The contact form posts to `/api/dispatch`, validates required fields, and delivers through Resend when configured or Formspree as fallback. If the browser cannot reach the dispatch endpoint, non-attachment form fields are queued locally and replayed when the browser comes back online.
