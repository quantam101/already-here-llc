# Already Here LLC Enterprise Operating System (AHEOS)
# Master Build Document

| Attribute | Value |
|---|---|
| Document | AHEOS Master Build Document |
| Version | 2.0.0 |
| Status | Governing blueprint |
| Prepared for | Stephen Franklin / Already Here LLC |
| Date | 2026-08-05 |
| Authority | This document is the single source of truth for all AHEOS architecture, agent boundaries, data models, failover rules, and production gates. |
| Legal posture | Architecture blueprint. Not a grant submission, contract offer, certification, or legal filing. |

---

## 1. Control items

| Control item | Rule |
|---|---|
| **Owner** | Stephen Franklin / Already Here LLC |
| **Primary objective** | Convert fragmented field-service, procurement, partner, and AI-automation activity into one reusable, revenue-generating, self-healing enterprise operating system. |
| **Authority boundary** | AHEOS may search, summarize, score, draft, queue, and alert. It may not submit, register, certify, sign, spend, contact, accept work, dispatch, or commit without owner approval. |
| **Build standard** | Zero-new-cost first; portable; proof-of-work first; server-side secrets; hardened security; audit logs; mobile-first; live-ready before selling externally. |
| **Truth standard** | Every capability is tagged `implemented`, `scaffolded`, or `target`. Completed assets are separated from prepared assets and unverified automation. |
| **Governance model** | One declarative VHLL manifest per operation. One ASI super-orchestrator dispatches exactly one deterministic agent per process. Every external action is approval-gated. |
| **Failover standard** | Degrade, never fail. The phone/PWA and Daily Command core answer even when servers, APIs, cloud models, and internet are unavailable. |

---

## 2. Mission and primary purpose

AHEOS is not a website. It is the company:

- Operating System
- CRM
- Dispatch platform
- AI command center
- Field management system
- Customer portal
- Technician portal
- Procurement engine
- Revenue engine
- Marketing platform
- Knowledge base
- Compliance platform
- Financial dashboard

AHEOS must generate revenue, reduce operating costs, automate repetitive work, create proof of work, capture institutional knowledge, protect cash flow, scale nationwide, build reusable assets, and increase company value.

---

## 3. Strategic objectives

| Objective | Outcome | Measurement |
|---|---|---|
| **Revenue** | Consistent field revenue with compounding recurring streams. | Booked jobs, gross margin, verified revenue events, repeat accounts, retainer conversions. |
| **Cost reduction** | Eliminate manual lead triage, dispatch data entry, and redundant searches. | Time per intake, automation savings, reused SOPs/packets. |
| **Automation** | AI agents handle intake, routing, scoring, drafting, and closeout assembly; humans approve external actions. | Agent runs, queued drafts, approval events, proof events. |
| **Proof of work** | Every completed job produces a timestamped closeout packet. | Closeout records, photo validation, signed reports. |
| **Institutional knowledge** | SOPs, checklists, customer history, and equipment history are queryable. | Knowledge-base records, search hits, training completions. |
| **Cash-flow protection** | Overdue invoices, payment failures, and cash shortages are surfaced before they harden. | A/R aging, overdue alerts, days sales outstanding. |
| **Nationwide scale** | Technician/vendor network and route stacking work across coverage zones. | Active technicians, coverage regions, route utilization. |
| **Reusable assets** | Every process becomes a packet, template, SOP, or sellable AI product. | Packet library size, productized offers, affiliate assets. |
| **Enterprise value** | AHEOS becomes a defensible, documented, revenue-generating platform. | Valuation inputs, recurring revenue, contract backlog. |

---

## 4. Revenue generation lanes

| Lane | Source | AHEOS surface | Status |
|---|---|---|---|
| Smart Hands / Data Center / Wireless / Network Engineering | Field dispatch intake, procurement overflow, partner networks | `app/dispatch`, `app/emergency-dispatch`, `lib/dispatch-schema.ts`, `lib/dispatch.ts` | **Implemented** with offline queue and Zod validation. |
| POS / Printer / Biomedical / Healthcare / Low Voltage / Door Access / CCTV | Industry pages + RFQ flow | `app/industries/[slug]`, `app/rfq`, `app/services-catalog`, `components/RFQForm.tsx` | **Implemented** as public pages. |
| Compliance / Tool Certification / Training | Certification tracking + SOP library | `docs/`, `content/`, `modules/security/module.yaml` | **Scaffolded**; needs `modules/compliance/module.yaml` and `agent_compliance_certification`. |
| AI Consulting / AI automation products | AI agent demo, lead capture, productized offers | `app/ai-agent`, `app/ai-lead-capture`, `lib/ai-agent-products.ts`, `app/api/ai-agent-lead` | **Implemented** as internal proof + external offer. |
| Dispatch services / PM services | Revenue Mesh + Daily Command | `lib/revenue-mesh.ts`, `app/revenue-mesh`, `app/revenue-command`, `app/daily-command` | **Implemented** scoring engine and dashboards. |
| Drone services | FAA Part 107 missions | Not yet in repo | **Target**; see Roadmap Phase 3. |
| Affiliate partnerships / Digital products / Retainers | ProfitEngine + marketplace | `profitengine/*`, `app/marketplace`, `app/affiliate` (if any) | **Partial**; ProfitEngine pipeline exists (`profitengine/pipeline.js`, `profitengine/publishers/`). |

---

## 5. Non-negotiable AHEOS principles

1. **Declarative VHLL first.** Every objective compiles into a manifest before execution.
2. **Zero-new-cost default.** Paid routes are disabled unless explicitly approved and budgeted.
3. **Fail closed.** Ambiguity in cost, permission, approval, or safety defaults to `BLOCKED`.
4. **One ASI per process.** The Super-AI Orchestrator dispatches exactly one agent per operation.
5. **Proof before public sale.** No AI product is sold externally until it produces an internal intake-to-closeout proof event.
6. **Server-side secrets.** Credentials never live in frontend bundles, prompts, screenshots, or Git.
7. **Audit every action.** Every agent run, handoff, approval, suppression, and correction is written to append-only JSONL.
8. **Degrade, never fail.** Offline, quota-locked, and degraded modes must still return useful answers.
9. **Military-grade hardening.** Rate limiting, least privilege, dependency scanning, CORS, validation, and security scanning are non-negotiable.
10. **Distillation.** Complex or external results are compressed into canonical, reusable, verifiable outputs.

---

## 6. AHEOS architecture overview

```text
┌─────────────────────────────────────────────────────────────────┐
│ Experience Layer                                                │
│ Public site  |  Customer portal  |  Technician portal  |  PWA  │
│ Voice input  |  Text fallback     |  Offline queue        |       │
└───────────────────────┬─────────────────────────────────────────┘
                        │ Next.js App Router / Vercel
┌───────────────────────▼─────────────────────────────────────────┐
│ API & Orchestration Layer                                       │
│ /api/dispatch  |  /api/daily-command  |  /api/revenue-mesh     │
│ /api/enterprise/orchestrator  |  /api/health  |  /api/runtime/ │
│ lib/global-enterprise-orchestrator.ts  |  lib/daily-command-core │
│ lib/revenue-mesh.ts  |  lib/level4-resiliency.ts  |  lib/rbac.ts │
└───────────────────────┬─────────────────────────────────────────┘
                        │ VHLL manifest + Super-AI dispatch
┌───────────────────────▼─────────────────────────────────────────┐
│ Agent & Module Layer                                            │
│ agents/enterprise-registry.yaml  |  modules/*/module.yaml       │
│ Opportunity  |  Scoring  |  Routing  |  Daily Command          │
│ AI Advisor  |  Intake  |  Field Network  |  Revenue  |  Proof   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ Connectors (default disabled)
┌───────────────────────▼─────────────────────────────────────────┐
│ Data & Execution Layer                                          │
│ SQLite WAL + Litestream  |  Redis  |  data/*.json  |  exports/  │
│ runtime/*.py  |  agents/*.py  |  local Ollama  |  Docker Compose│
└───────────────────────┬─────────────────────────────────────────┘
                        │ Optional accelerators only
┌───────────────────────▼─────────────────────────────────────────┐
│ External Accelerators (failover-enabled)                      │
│ Vercel  |  OCI/VPS  |  GitHub  |  Finnhub  |  Stripe  |  LLMs   │
└─────────────────────────────────────────────────────────────────┘
```

### Runtime targets

| Layer | Target | Evidence |
|---|---|---|
| Public site | Vercel (`www.alreadyherellc.com`) | `next.config.mjs`, `vercel.json` |
| API routes | Next.js App Router + Edge/Vercel Functions | `app/api/*` |
| Sovereign core | Python runtime on OCI Always Free / VPS via Docker Compose | `Dockerfile.runtime`, `docker-compose.yml`, `runtime/` |
| Database | SQLite WAL (`data/`) with migration path to PostgreSQL | `data/`, `revenue-command/schema/revenue-command-spine.sql` |
| AI fallback | Local Ollama; cloud only after cost approval | `connectors/registry.yaml` (`ollama_local`), `lib/llm-gateway.ts` |
| Reverse proxy | Caddy or Nginx with automatic TLS | `caddy/`, `nginx/` |

---

## 7. Module inventory and implementation map

### 7.1 AI Office Manager / Second-in-Command

| Item | Detail |
|---|---|
| **Purpose** | Acts as second in command: email/calendar review, dispatch monitoring, revenue monitoring, payment monitoring, follow-up, vendor management, proposal/report generation, KPI monitoring, risk alerts. |
| **Agents** | `agent_daily_command` → `agent_ai_operations_advisor` → `agent_intake` → `agent_outreach` |
| **Implementation** | `lib/daily-command-super-ai.ts`, `lib/daily-command-core.ts`, `app/daily-command/page.tsx`, `app/api/daily-command/route.ts` |
| **Control plane** | `lib/global-enterprise-orchestrator.ts` + `agents/enterprise-registry.yaml` |
| **Status** | **Implemented** — deterministic daily command API and UI exist. Persistent thread model and Gmail connector are **scaffolded**. |
| **Failover** | `DAILY_COMMAND_FORCE_OFFLINE=1` returns a local-first response; no API key required. |
| **Next action** | Wire `agent_daily_command` to read from `revenue_events`, `dispatch_leads`, and `system_health_signals`; add persistent conversation record to `conversations` table. |

### 7.2 Daily Command Center

| Item | Detail |
|---|---|
| **Purpose** | Single dashboard containing revenue, jobs today/tomorrow, route stacking, revenue forecast, payments, invoices, collections, operations, dispatches, technician locations, equipment, customers, vendors, projects, work orders, and system health. |
| **Implementation** | `app/daily-command/page.tsx`, `app/command-center/*` (`modules`, `agents`, `approvals`, `logs`, `workflows`, `security`, `costs`, `changelog`), `app/revenue-command/page.tsx`, `app/revenue-mesh/page.tsx` |
| **Health surfaces** | `/api/health`, `/api/runtime/status`, `/api/enterprise/orchestrator` |
| **Status** | **Implemented** — UI scaffold and API endpoints exist. Live data wiring is **scaffolded**. |
| **Failover** | `lib/level4-resiliency.ts` maintains in-process event queue with `queued`, `committed`, `degraded_queued`, and `dead_letter` states. |
| **Next action** | Connect each command-center card to real data via `lib/revenue-command-spine.ts` and add role-based visibility. |

### 7.3 CRM

| Item | Detail |
|---|---|
| **Purpose** | Store customers, sites, equipment, history, photos, notes, billing, contracts, technicians, skills, certifications, rates, availability, coverage, background, performance, vendors, contacts, territories, rates, requirements, and payment terms. |
| **Canonical schema** | `revenue-command/schema/revenue-command-spine.sql`; `lib/revenue-command-spine.ts` `DATABASE_TABLES` |
| **Key tables** | `organizations`, `contacts`, `leads`, `opportunities`, `jobs`, `dispatches`, `technicians`, `vendors`, `vehicles`, `repair_orders`, `hauling_jobs`, `routes` |
| **UI surfaces** | `app/dashboard/page.tsx`, `app/technician-network/page.tsx`, `app/ginc/*` (members, listings, jobs, matches), `app/admin/page.tsx` |
| **Storage** | `lib/ginc-store.ts` (JSON file + Redis), `lib/lead-capture-accounts.ts` |
| **Status** | **Scaffolded** — schema and UI exist; production persistence requires SQLite/Postgres migrations and RBAC. |
| **Failover** | Local JSON seed (`data/ginc-network.json`) loads when Redis is unavailable. |
| **Next action** | Implement `data/organizations.sql` migrations, CRUD API routes under `/api/crm/*`, and technician/vendor profile forms. |

### 7.4 Dispatch System

| Item | Detail |
|---|---|
| **Purpose** | Customer intake, AI routing, route optimization, technician matching, SMS/email, GPS, check-in/check-out, photo upload, signatures, closeout reports, invoice generation. |
| **Implementation** | `lib/dispatch.ts`, `lib/dispatch-schema.ts` (Zod, zero-trust), `lib/dispatch-offline-queue.ts`, `components/DispatchForm.tsx`, `app/dispatch/page.tsx`, `app/emergency-dispatch/page.tsx`, `app/api/dispatch/route.ts` |
| **Validation** | All dispatch inputs are validated before business logic; honeypot, email, phone, file type/size checks. |
| **Status** | **Implemented** — public intake, schema, offline queue, and API are live. |
| **Failover** | `lib/dispatch-offline-queue.ts` serializes non-attachment form fields to `localStorage` and replays on reconnect. |
| **Next action** | Add technician matching score in `lib/dispatch.ts`, route optimization module, and approval-gated SMS/email via queued actions. |

### 7.5 Field Operations / Technician App

| Item | Detail |
|---|---|
| **Purpose** | Mobile-first technician experience: offline mode, camera, barcode/VIN scanner, GPS, time tracking, mileage, expenses, PDF reports, required photo validation. |
| **Current state** | Web forms + offline queue; no native technician PWA yet. |
| **Implementation** | `app/dispatch/DispatchPageClient.tsx`, `components/DispatchForm.tsx`, `public/daily-command-sw.js` |
| **Status** | **Scaffolded** — PWA service worker exists, but dedicated technician interface is missing. |
| **Failover** | Service worker caches core assets; offline queue replays submissions. |
| **Next action** | Create `app/technician/page.tsx`, `app/api/technician/checkin/route.ts`, and `lib/technician-field-report.ts`; add camera/photo validation. |

### 7.6 Website and Portals

| Item | Detail |
|---|---|
| **Public surfaces** | `app/page.tsx` (Home), `app/services`, `app/who-we-serve`, `app/service-area`, `app/capability-statement`, `app/rfq`, `app/contact`, `app/dispatch`, `app/ai-agent`, `app/government-contracting`, `app/industries/[slug]`, `app/services-catalog`, `app/blog` |
| **Private surfaces** | `app/dashboard`, `app/admin`, `app/command-center/*`, `app/revenue-command`, `app/revenue-mesh`, `app/daily-command` |
| **AI assistant** | `app/ai-agent`, `app/ai-lead-capture`, `app/ai-receptionist`, `components/AiAgentLeadForm.tsx` |
| **Knowledge center** | `docs/`, `posts/`, `content/` |
| **Status** | **Implemented** — public and private pages exist; authentication/SSO is **scaffolded** via `lib/rbac.ts` and needs enforcement. |
| **Failover** | Static public pages are pre-rendered; command pages degrade to cached summaries when API is down. |
| **Next action** | Add session middleware (`middleware.ts`) to gate private routes by role and enforce `admin`/`moderator`/`member` hierarchy. |

### 7.7 Procurement

| Item | Detail |
|---|---|
| **Purpose** | Monitor SAM.gov, state/county/city, healthcare, education, retail, utilities, telecom; track RFQs, RFPs, contracts, renewals, awards. |
| **Implementation** | `modules/procurement/module.yaml`, `agents/enterprise-registry.yaml` (`agent_opportunity_intelligence`, `agent_procurement_grant`, `agent_scoring`, `agent_routing`), `app/government-contracting/page.tsx`, `app/rfq/page.tsx`, `data/revenue-pipeline.json` |
| **Connectors** | `sam_gov_read`, `sourcewell_naspo_read`, `public_web_search`, `government_api_read` (default `enabled: false`) |
| **Status** | **Implemented** — module and agents registered; live ingestion is **target** until connectors are enabled and approved. |
| **Failover** | Local deterministic scoring works without external procurement APIs. |
| **Next action** | Build `app/api/procurement/scan/route.ts` and `lib/procurement-scanner.ts`; enable public-web search only after cost/approval gate. |

### 7.8 Compliance

| Item | Detail |
|---|---|
| **Purpose** | Manage OSHA, tool calibration, annual inspections, insurance, licenses, technician certifications, and customer requirements. |
| **Implementation** | `modules/security/module.yaml`, `security/no-spend-policy.yaml`, `lib/rbac.ts`, `app/legal/terms`, `app/legal/gdpr` |
| **Status** | **Scaffolded** — security and policy layer exists; certification tracking is **target**. |
| **Failover** | Compliance blocks external actions by default (`fail_closed`). |
| **Next action** | Create `modules/compliance/module.yaml`, `lib/compliance.ts`, and `app/compliance/page.tsx`; add expiration alerts and `compliance_flags` table. |

### 7.9 Financial Operations

| Item | Detail |
|---|---|
| **Purpose** | Track revenue, expenses, cash flow, A/R, A/P, credit utilization, taxes, payroll, profitability; alert on overdue invoices, payment failures, late fees, cash shortages. |
| **Implementation** | `app/dashboard/payments/page.tsx`, `components/StripePaymentButton.tsx`, `lib/revenue-command-spine.ts` (`revenue_events`, `audit_logs`) |
| **Status** | **Scaffolded** — Stripe checkout preview exists; ledger and alerts are **target**. |
| **Failover** | Revenue events are recorded locally before any Stripe mutation. |
| **Next action** | Create `lib/financial.ts`, `app/financial/page.tsx`, `modules/financial/module.yaml`, and `agent_financial`; implement invoice aging and cash-flow alerts. |

### 7.10 Drone Division

| Item | Detail |
|---|---|
| **Purpose** | FAA Part 107 support, roof inspections, solar, mapping, construction, thermal, insurance, emergency response; track training, certifications, equipment, missions, customers. |
| **Implementation** | None yet in repo. |
| **Status** | **Target** — see Roadmap Phase 3. |
| **Next action** | Create `modules/drone/module.yaml`, `lib/drone.ts`, `app/drone/page.tsx`, and `agent_drone_operations`. |

### 7.11 Marketing Engine

| Item | Detail |
|---|---|
| **Purpose** | Automate SEO, blog, social media, email campaigns, case studies, portfolio, customer reviews, landing pages. |
| **Implementation** | `profitengine/pipeline.js`, `profitengine/agents/content-generator.js`, `profitengine/publishers/`, `app/blog/*`, `app/ai-agent-resources`, `lib/profitengine.ts` |
| **Status** | **Partial** — content pipeline and blog exist; social/email scheduling is **scaffolded**. |
| **Failover** | Content generation runs from local data when external publishers are disabled. |
| **Next action** | Integrate ProfitEngine webhooks with `app/api/sync-blogs/route.ts` and add approval queue before public posting. |

### 7.12 Knowledge Base

| Item | Detail |
|---|---|
| **Purpose** | Store SOPs, checklists, photos, videos, training, lessons learned, customer history, equipment history. |
| **Implementation** | `docs/`, `posts/`, `content/`, `public/`, `daily-command/TASK_CATALOG.md`, `LIFELONG_CATCH_AND_CORRECT.md`, `CHANGELOG_LIFELONG.md` |
| **Status** | **Implemented** as static documentation; semantic search is **target**. |
| **Failover** | Static files are committed and cached; no external dependency. |
| **Next action** | Add `lib/knowledge-base.ts` with vector cache (`runtime/vector_cache.py`) and agent `agent_knowledge_assistant`. |

### 7.13 AI Systems

| Item | Detail |
|---|---|
| **Purpose** | AI Operations Advisor, AI Dispatcher, AI Office Manager, AI Proposal Writer, AI Scheduler, AI Revenue Analyst, AI Compliance Officer, AI Procurement Analyst, AI Marketing Assistant, AI Knowledge Assistant. |
| **Implementation** | `agents/enterprise-registry.yaml` defines all agents; `lib/global-enterprise-orchestrator.ts` dispatches them. |
| **Agents and roles** | See `agents/enterprise-registry.yaml` for `super_ai_orchestrator`, `agent_opportunity_intelligence`, `agent_scoring`, `agent_routing`, `agent_daily_command`, `agent_ai_operations_advisor`, `agent_intake`, `agent_field_network`, `agent_revenue`, `agent_procurement_grant`, `agent_grant_procurement_packet`, `agent_backend_command`, `agent_proof`, `agent_outreach`, `agent_compliance`, `agent_lifelong_catch_correct`. |
| **Status** | **Implemented** — registry and orchestrator are live. |
| **Failover** | Orchestrator falls back to deterministic local output when LLM providers are unavailable. |
| **Next action** | Add missing agents for `financial`, `drone`, `marketing`, and `knowledge` operations; map each to a module. |

### 7.14 Security

| Item | Detail |
|---|---|
| **Purpose** | Role-based access, audit logs, encrypted secrets, MFA, daily backups, disaster recovery, activity monitoring. |
| **Implementation** | `lib/rbac.ts` (member/moderator/admin), `modules/security/module.yaml`, `security/no-spend-policy.yaml`, `lib/audit.ts`, `lib/level4-resiliency.ts`, `.env.example` |
| **Status** | **Implemented** — RBAC helpers, audit interface, no-spend policy exist. MFA/SSO is **scaffolded**. |
| **Failover** | `CONNECTORS` default to `enabled: false`; paid routes fail closed. |
| **Next action** | Enforce `middleware.ts` role gating, add MFA/SSO via `next-auth` or OAuth, and implement automated Litestream backup verification. |

### 7.15 Analytics

| Item | Detail |
|---|---|
| **Purpose** | Measure revenue by customer/technician/service, route efficiency, first-time fix rate, customer satisfaction, gross/net margin, response times, utilization. |
| **Implementation** | `lib/revenue-command-spine.ts` (`analytics_events`, `system_health_signals`), `app/asi-revenue-intelligence/page.tsx`, `lib/telemetry.ts`, `app/revenue-command/page.tsx` |
| **Status** | **Scaffolded** — event schemas exist; dashboards are static or mock. |
| **Failover** | Telemetry collector buffers events in memory and writes JSONL; no external dependency. |
| **Next action** | Build `/api/analytics/*` endpoints and `app/analytics/page.tsx` using `analytics_events` and `revenue_events` tables. |

---

## 8. Data and record model

Canonical tables are declared in `lib/revenue-command-spine.ts` and `revenue-command/schema/revenue-command-spine.sql`.

| Table / record type | Purpose |
|---|---|
| `organizations` | Companies, agencies, primes, vendors, grant sponsors, clients, prospects. |
| `contacts` | Procurement contacts, vendor managers, recruiters, dispatch contacts, support contacts. |
| `leads` | Inbound or routed service work requiring scope/rate/schedule review. |
| `opportunities` | Procurement, grants, RFIs, RFQs, field assignments, teaming paths, programs. |
| `jobs` | Confirmed work orders with scope, schedule, and assigned resources. |
| `dispatches` | Dispatch requests, technician assignments, status, and closeout links. |
| `technicians` | Skills, certifications, rates, availability, coverage, background, performance. |
| `vendors` | Contacts, territories, rates, requirements, payment terms. |
| `vehicles` | Fleet and field equipment tracking. |
| `repair_orders` | Device and equipment repair work. |
| `hauling_jobs` | Asset transport and logistics jobs. |
| `routes` | Route stacking and optimization records. |
| `procurement_targets` | SAM.gov, state, county, city, healthcare, education, retail, utility, telecom targets. |
| `products` | Productized offers and digital products. |
| `affiliate_links` | Partner and affiliate revenue links. |
| `reviews` | Customer satisfaction and proof records. |
| `conversations` | AI and human conversation threads tied to accounts/opportunities. |
| `ai_actions` | Agent runs, inputs, outputs, and approvals. |
| `analytics_events` | Telemetry and business intelligence events. |
| `audit_logs` | Append-only record of all system actions. |
| `proof_of_work` | Closeout packets, photos, notes, signoffs, and evidence. |
| `codex_changelog` | Permanent changelog of system changes. |
| `catch_correct_events` | Lifelong error correction log. |
| `system_health_signals` | Health, provider, and failover status. |
| `enterprise_operation_runs` | Each dispatched VHLL operation (ASIOS extension). |

### Dispatch input schema

`lib/dispatch-schema.ts` defines the zero-trust `DispatchPayload` type derived from Zod. Invariants:

- All strings are trimmed and length-bounded.
- Emails match RFC pattern and are lowercased.
- Phones require `>= 10` digits.
- Honeypot must be empty.
- Attachments are constrained to PDF/JPEG/PNG and `<= 10 MB`.
- Result is a discriminated union; callers must handle `ok: false`.

---

## 9. VHLL / ASI orchestration

Every AHEOS operation begins as a VHLL manifest. The canonical lifecycle is:

```text
objective -> manifest -> schema validation -> no-spend policy -> minify
  -> vector cache check -> complexity scoring -> route decision
  -> local script | local AI | approval queue -> verify -> security scan
  -> audit log -> memory commit -> lifelong catch and correct
```

### Manifest schema

| Field | Type | Purpose |
|---|---|---|
| `objective` | string | Human-readable goal. |
| `process` | enum | One of the registered enterprise processes. |
| `agent` | string | Exact agent responsible. |
| `operation` | string | Deterministic operation to perform. |
| `inputs` | object | Normalized, validated input records. |
| `expected_outputs` | object | Declared output schema and verification rules. |
| `allowed_connectors` | string[] | Connectors the agent may touch. |
| `forbidden_actions` | string[] | Actions that immediately block the operation. |
| `approval_required` | boolean | Owner approval gate. |
| `max_cost_usd` | number | Hard cost ceiling. Default `0`. |
| `verification_rules` | string[] | How output is verified. |
| `audit_level` | enum | `full`, `summary`, or `none` (default `full`). |

### State machine

| State | Meaning |
|---|---|
| `RECEIVED` | Objective accepted and manifest created. |
| `MANIFEST_VALID` | Schema, no-spend, and security pre-checks passed. |
| `CACHE_HIT` | Verified previous result returned without re-execution. |
| `COST_OK` | Cost guard confirms operation is within budget. |
| `APPROVAL_REQUIRED` | External or sensitive action; blocked until approval. |
| `EXECUTING` | Agent function is running. |
| `VERIFYING` | Output is being verified. |
| `COMMITTED` | Output verified and written to memory/audit. |
| `BLOCKED` | Operation failed a gate and is logged for review. |

State transitions produce a new state object; prior states are never mutated. See `docs/FORMAL_VERIFICATION.md` for the immutability proof.

### Super-AI Orchestrator invariants

1. One operation = one agent.
2. No agent performs another agent's operation.
3. No agent performs a forbidden external action.
4. Every operation returns `approvalRequired` and `nextAgent`.
5. Every operation writes to the audit log.
6. Every failed or blocked operation triggers a Lifelong Catch and Correct event.

### Agent registry

The canonical registry is `agents/enterprise-registry.yaml`. Each agent declares allowed connectors, forbidden actions, approval-required actions, cost ceiling, and verification requirement.

---

## 10. Failover and never-down design

### Daily Command modes

| Mode | Trigger | Behavior |
|---|---|---|
| `online_accelerated` | All APIs available and quota unlocked | Use optional acceleration. |
| `local_first` | Normal safe mode | Prefer local deterministic logic. |
| `quota_locked` | `DAILY_COMMAND_QUOTA_LOCK=1` or `ECOSYSTEM_QUOTA_LOCK=1` | Block external calls; still respond. |
| `offline_survivable` | `DAILY_COMMAND_FORCE_OFFLINE=1` or no network | Continue local PWA operation. |
| `last_resort_static` | Unexpected local error | Return static command payload. |

### Failover layers

1. **Browser offline queue.** `lib/dispatch-offline-queue.ts` saves non-attachment form fields to `localStorage` and replays on reconnect.
2. **PWA service worker.** `public/daily-command-sw.js` caches core assets for offline use.
3. **Level-4 resiliency.** `lib/level4-resiliency.ts` tracks events through `queued` → `processing` → `committed`/`degraded_queued`/`dead_letter`.
4. **LLM provider cascade.** `lib/llm-gateway.ts` routes through configured gateway → Groq → Gemini with deterministic fallback.
5. **Local AI fallback.** `ollama_local` connector and `runtime/vector_cache.py` serve responses when cloud models fail.
6. **Data replication.** SQLite WAL + Litestream (configured in `docker-compose.yml`) plus exportable CSV/JSON/DOCX/ZIP packets.
7. **Health endpoints.** `/api/health`, `/api/runtime/status`, and `/api/enterprise/orchestrator` expose live status.

### Backup and recovery

- SQLite databases replicated with Litestream to object storage.
- Audit logs are append-only JSONL and rotated daily.
- Exported packets written to `exports/` and versioned.
- Recovery drills run monthly.

---

## 11. Security, compliance, and audit

### Security posture

- Fail closed.
- Least privilege.
- No raw secrets in frontend or repo.
- No paid adapters enabled by default.
- No risky action without approval.
- Verify before memory commit.
- Back up before production changes.

### Secret discipline

Secrets are read from `process.env` or a vault at runtime. No secret is embedded in frontend bundles, prompts, screenshots, ZIP files, or Git. All environment variables are declared in `.env.example` without values.

### Role-based access

`lib/rbac.ts` defines the hierarchy:

| Role | Level | Capabilities |
|---|---|---|
| `member` | 0 | View own records, submit dispatch/RFQ. |
| `moderator` | 1 | Moderate listings/jobs, manage member content. |
| `admin` | 2 | Full command-center access, approvals, system settings. |

### Audit and proof

- Every agent run produces a `proof_event` with `input_hash`, `output_hash`, `agent_id`, `operation`, `approval_status`, and `receipt`.
- Audit logs are append-only JSONL.
- Memory commits are idempotent.
- Corrections are logged in `LIFELONG_CATCH_AND_CORRECT.md` and propagated to the agent registry.

### Approval gates

The following are prohibited unless Stephen explicitly approves the specific item:

- Submit a bid, quote, grant application, RFI response, or Project Pitch.
- Register a new account, certify a status, accept portal terms, sign forms, or verify tax information.
- Send an email, contact an agency/sponsor/prime, call a recruiter, or message a candidate.
- Accept or confirm a field assignment, dispatch a technician, or commit to a schedule.
- Spend money, buy materials, subscribe to a paid service, pay an application fee, or enroll in a paid program.
- Claim SDVOSB, VOSB, SBE, VBE, HUBZone, minority, disability, or other status unless active/allowed in that portal.
- Perform licensed electrical, low-voltage, security, alarm, or regulated clinical/laboratory work unless legal coverage and qualifications are verified.

---

## 12. CI/CD and production readiness

### Quality gates

The build must pass the following gates before any module is treated as production ready:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test
python -m pytest tests/
npm run qa:content
npm run qa:seo
npm run qa:gate
node scripts/agent-healthcheck.mjs
```

### Required CI

Each PR must pass:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `python -m pytest tests/ -v`
- `npm run security:scan`
- `node scripts/a-plus-content-guard.mjs`
- Offline Daily Command test: `DAILY_COMMAND_FORCE_OFFLINE=1` → `/api/daily-command` returns `ok: true`
- Quota-lock test: `DAILY_COMMAND_QUOTA_LOCK=1` → no external calls, still responds

### Module healthchecks

Every module in `modules/*/module.yaml` declares a `healthcheck`. The orchestrator iterates modules and calls each healthcheck endpoint to prove liveness.

### Production readiness checklist

- [ ] All modules in `modules/*/module.yaml` are `state: production_ready` and `enabled: true`.
- [ ] `agents/enterprise-registry.yaml` loads and validates against the schema.
- [ ] `/api/enterprise/orchestrator` returns HTTP 200 for every registered operation.
- [ ] `/api/health` reports Level-4 resiliency mode and provider status.
- [ ] `/api/runtime/status` reports recent events, queue depth, and dead-letter count.
- [ ] Content guard, lint, typecheck, build, and tests pass.
- [ ] No raw secrets are committed or embedded in frontend bundles.
- [ ] Every external action routes through the owner approval gate.
- [ ] Audit logs are written for every agent run.
- [ ] Backup and recovery paths are verified.
- [ ] Zero-spend mode is active (`strict_zero_spend`).
- [ ] All new agents have a corresponding module healthcheck.

---

## 13. Success metrics

### Daily

- Minimum field revenue: `$500`.
- Route utilization rate.
- Dispatch response time.
- Outstanding payments count and aging.
- Open opportunities count.

### Weekly

- New customers.
- Repeat customers.
- Retainers won.
- Contracts submitted.
- Revenue generated.

### Monthly

- Profit and gross/net margin.
- Cash flow.
- Customer and technician growth.
- Website conversions.
- Automation savings (hours reclaimed × hourly value).
- A/R days outstanding.
- First-time fix rate.

---

## 14. Implementation roadmap

### Phase 0 — Foundation (now)

1. Adopt this AHEOS Master Build Document as the governing blueprint.
2. Enforce `middleware.ts` role gating on `/command-center/*`, `/admin`, `/revenue-command`, `/daily-command`.
3. Connect command-center cards to `lib/revenue-command-spine.ts` via real API routes.
4. Run full CI and production-readiness checklist.

### Phase 1 — Revenue capture

1. Implement SQLite persistence for `organizations`, `contacts`, `leads`, `opportunities`, `jobs`, `dispatches`.
2. Wire `lib/dispatch.ts` to technician/vendor matching and route scoring.
3. Add approval-gated SMS/email queue (`lib/sms.ts`, outbound email draft queue).
4. Build `app/financial/page.tsx` A/R and cash-flow alerts.

### Phase 2 — Intelligence and automation

1. Enable procurement scanning (`lib/procurement-scanner.ts`, `app/api/procurement/scan`) behind approval gate.
2. Add `agent_financial`, `agent_marketing`, `agent_knowledge_assistant` to `agents/enterprise-registry.yaml`.
3. Implement knowledge-base semantic search (`lib/knowledge-base.ts`, `runtime/vector_cache.py`).
4. Automate ProfitEngine publishing through approval queue.

### Phase 3 — Scale and specialized divisions

1. Create `modules/drone/module.yaml`, `lib/drone.ts`, `app/drone/page.tsx`, and `agent_drone_operations`.
2. Add native technician PWA (`app/technician/*`) with photo/check-in/check-out.
3. Expand nationwide coverage map and technician onboarding.
4. Implement SSO/MFA and full RBAC enforcement.

### Phase 4 — Enterprise value

1. Package AHEOS as a sellable platform/white-label offer.
2. Certify SOC 2 / NIST- readiness documentation.
3. Monetize data products and AI automation offerings.
4. Continuous distillation of SOPs and reusable assets.

---

## 15. Approval gates and forbidden actions summary

### Always blocked without explicit approval

- paid_api_call, email_send, sms_send, public_post
- submit_application, create_external_account, dispatch_technician, accept_work
- move_money, invoice_send, production_deploy, repo_merge
- any_direct_external_action when not explicitly allowed by manifest

### Cost guard behavior

- If `max_cost_usd > 0` and no explicit approval token is present, the operation is `BLOCKED`.
- In `strict_zero_spend` mode, all paid routes are disabled.
- Verification rule failure discards output and transitions to `BLOCKED`.

---

## 16. Appendix: canonical file index

### Core orchestration and agents

- `agents/enterprise-registry.yaml` — canonical agent registry
- `lib/global-enterprise-orchestrator.ts` — ASI control plane
- `lib/daily-command-core.ts` — local-first Daily Command engine
- `lib/daily-command-super-ai.ts` — Super-AI daily summary chain
- `lib/revenue-command-spine.ts` — canonical data model and revenue records
- `revenue-command/schema/revenue-command-spine.sql` — SQL schema

### Security and resiliency

- `lib/level4-resiliency.ts` — Level-4 event queue and failover
- `lib/rbac.ts` — role-based access helpers
- `lib/llm-gateway.ts` — provider cascade and fallback
- `security/no-spend-policy.yaml` — zero-spend policy
- `modules/security/module.yaml` — security module declaration

### Dispatch and field

- `lib/dispatch.ts` — dispatch business logic
- `lib/dispatch-schema.ts` — zero-trust Zod schema
- `lib/dispatch-offline-queue.ts` — offline replay queue
- `app/dispatch/page.tsx` — public dispatch page
- `app/api/dispatch/route.ts` — dispatch API
- `components/DispatchForm.tsx` — dispatch intake form

### Revenue and command

- `lib/revenue-mesh.ts` — revenue scoring and productized offers
- `app/revenue-mesh/page.tsx` — Revenue Mesh UI
- `app/revenue-command/page.tsx` — Revenue Command dashboard
- `app/daily-command/page.tsx` — Daily Command dashboard
- `app/command-center/*` — command-center sub-pages
- `app/api/revenue-mesh/route.ts` — Revenue Mesh API
- `app/api/daily-command/route.ts` — Daily Command API

### Public and private surfaces

- `app/page.tsx`, `app/services`, `app/who-we-serve`, `app/contact`, `app/rfq`, `app/capability-statement`, `app/government-contracting`, `app/industries/[slug]`, `app/services-catalog`, `app/blog` — public site
- `app/dashboard/*`, `app/admin`, `app/technician-network`, `app/ginc/*` — private portals

### Modules

- `modules/business-os/module.yaml`
- `modules/eaos/module.yaml`
- `modules/procurement/module.yaml`
- `modules/security/module.yaml`
- `modules/lifecycle/module.yaml`
- `modules/content-engine/module.yaml`
- `modules/document-intelligence/module.yaml`
- `modules/profitengine/module.yaml`
- `modules/tradegate/module.yaml`

### Marketing and content

- `profitengine/pipeline.js`
- `profitengine/agents/content-generator.js`
- `profitengine/publishers/*`
- `content/`, `posts/`, `docs/`

### Tests and quality

- `tests/daily-command-core.test.mjs`
- `tests/revenue-mesh.test.mjs`
- `tests/level4-resiliency.test.mjs`
- `tests/enterprise-orchestrator.test.mjs`
- `scripts/a-plus-content-guard.mjs`
- `scripts/quality-gate.mjs`
- `scripts/agent-healthcheck.mjs`

---

## 17. Glossary

- **AHEOS** — Already Here LLC Enterprise Operating System.
- **ASIOS** — Autonomous Intelligence Operating System; the declarative VHLL orchestration layer.
- **VHLL** — Very High-Level Language; manifest-first intent compilation.
- **Daily Command** — Local-first operational nerve center and dashboard.
- **Revenue Mesh** — Deterministic scoring engine for field-service and productized offers.
- **Revenue Spine** — Canonical data model for revenue and operations records.
- **GINC** — Growth & Interconnected Networks Collective, a DBA/network layer of Already Here LLC.
- **Fail closed** — Default to BLOCKED when permission, cost, or safety is unclear.
- **Zero-spend** — Default mode blocking all paid API/resource consumption.
- **Lifelong Catch and Correct** — Continuous error logging and rule propagation loop.
