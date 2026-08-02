# AHFOS v1.0 — Intake-to-Closeout Scaffold Plan

This document turns the AHFOS v1.0 Enterprise Build Specification into a concrete, declarative, agent-per-process scaffold that can be built and run immediately.

## Scope of this scaffold

Deliver the first production milestone: a complete intake-to-closeout workflow running on real jobs.

- Customer registration / login
- Service request (AI intake)
- Dispatcher dashboard with live job board
- Technician mobile view
- Closeout packet (photos, labor, materials, signature, recommendations)
- Invoice and review triggers
- Knowledge-base update hook

Out of scope for this milestone: multi-tenancy/white-label, marketplace, AI sales module, AR/IoT, and deep third-party accounting integrations. Those are explicitly Phase 2.

## Declarative architecture

Every process in the field-ops lifecycle gets its own agent. Agents are pure functions that accept a typed context and return a deterministic action plan. When an LLM is available the plan is enriched; when offline or quota-locked the agent falls back to a deterministic local plan.

```text
Intake Agent    → converts a service request into a validated Job + Dispatcher Packet
Dispatch Agent  → prioritizes, assigns, routes, and estimates arrival
Tech Agent      → builds checklist, suggests parts, surfaces repair history
Closeout Agent  → verifies completion, builds invoice/review triggers, warranty note
Invoice Agent   → prepares invoice payload (Stripe/Square/QuickBooks ready)
Review Agent    → prepares review request payload
KB Agent        → extracts reusable knowledge from the completed job
```

All agents run through the existing Level-4 resilient runtime. They do not make side effects directly; they append events to a job's immutable event log. API route handlers materialize the events into state changes.

## Data model

### Core entities

- `User` — id, email, passwordHash, name, roles[], company, createdAt
- `Customer` — id, userId, name, company, phone, email, addresses, createdAt
- `Site` — id, customerId, name, address, gps, accessNotes, createdAt
- `Asset` — id, customerId, siteId, category, make, model, serial, vin, assetTag, history, createdAt
- `Job` — id, status, priority, trade, skill, estimatedDuration, customer, site, assetIds, dispatcherPacket, assignedTo, timeline, checklist, parts[], labor[], materials[], beforePhotos[], afterPhotos[], signature, warranty, invoice, review, createdAt, updatedAt
- `JobEvent` — id, jobId, type, agent, actor, payload, timestamp
- `KnowledgeEntry` — id, problem, resolution, trade, parts, labor, time, cost, successRate, sourceJobId

### Job status machine

```text
lead → intake → quoted → approved → assigned → in_progress → completed → closed
       ↓         ↓         ↓           ↓            ↓              ↓
   cancelled  waiting   waiting   waiting     waiting       invoice_trigger
              quote    approval  parts      technician      review_trigger
              customer
```

## Storage strategy

Scaffold uses append-only JSON files under `data/ahfos/` so it runs with no external database. This is a deliberate local-first, zero-dependency choice. Production deployment should migrate to Postgres via the same repository interface.

- `data/ahfos/users.jsonl`
- `data/ahfos/jobs.jsonl`
- `data/ahfos/events.jsonl`
- `data/ahfos/assets.jsonl`
- `data/ahfos/knowledge.jsonl`

## Authentication & RBAC

- Symmetric-signed JWT session in `ahfos_session` httpOnly cookie
- Roles: customer, dispatcher, project_manager, technician, office_manager, sales, accounting, vendor, admin
- Passwords hashed with scrypt (Node crypto)
- Permission helpers guard API routes and server-rendered pages

## API surface

```
POST   /api/ahfos/auth/login
POST   /api/ahfos/auth/logout
GET    /api/ahfos/auth/session
GET    /api/ahfos/jobs
POST   /api/ahfos/jobs
GET    /api/ahfos/jobs/:id
PATCH  /api/ahfos/jobs/:id
POST   /api/ahfos/jobs/:id/agent
POST   /api/ahfos/assets
GET    /api/ahfos/assets
```

## UI surface

```
/portal                    Customer portal (list jobs, request service)
/portal/request            Service request form
/dispatch-board            Dispatcher dashboard
/technician/jobs/:id       Technician mobile job view
/closeout/:id              Closeout page
/command-center/field-ops  Admin/dispatcher command view
```

## Build order within the scaffold

1. `lib/ahfos/schema.ts` — typed data model
2. `lib/ahfos/store.ts` — JSONL persistence layer
3. `lib/ahfos/auth.ts` — session + RBAC
4. `lib/ahfos/agents.ts` — per-process agents
5. `app/api/ahfos/*` — API routes
6. `app/(ahfos)/*` — pages and components
7. `tests/ahfos-intake.test.mjs` — smoke tests
8. Lint / typecheck / build / content guard

## Success criteria

- A customer can register, log in, request service, and view job status.
- A dispatcher can log in, see the job board, assign a technician, and change status.
- A technician can log in, see assigned jobs, update checklist, add notes/photos, and mark complete.
- A closeout produces a packet with before/after, labor, materials, signature, and triggers invoice/review.
- All state transitions are append-only and auditable.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
