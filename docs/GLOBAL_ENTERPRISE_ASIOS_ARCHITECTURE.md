# Global Enterprise ASIOS Architecture

Prepared for Stephen Franklin / Already Here LLC  
Prepared date: August 5, 2026  
Document status: Architecture blueprint. Not a grant submission, contract offer, certification, or legal filing.  
Version: 1.0.0

## 1. Design principles

Global Enterprise ASIOS (Autonomous Intelligence Operating System) is the declarative, VHLL-driven orchestration layer for Already Here LLC. It is governed by the following principles:

- **One ASI control plane.** A single super-intelligent orchestrator receives objectives and dispatches them to exactly one agent per process.
- **Declarative VHLL first.** Every objective is compiled into a manifest that declares intent, inputs, expected outputs, allowed connectors, forbidden actions, approval requirements, and verification rules before any execution.
- **Zero-new-cost default.** All default paths use local files, free tooling, and server-side resources. Paid routes are disabled until explicitly approved and budgeted.
- **Fail closed.** Any ambiguity in cost, permission, approval, or safety defaults to BLOCKED.
- **Proof before public sale.** No AI automation product is marketed externally until it has produced an internal intake-to-closeout proof event.
- **Server-side secrets.** Private keys, tokens, credentials, and PII never live in frontend bundles, screenshots, prompts, or version control.
- **Audit every action.** Every agent run, handoff, approval, suppression, and correction is written to an immutable audit log.
- **Military-grade hardening.** Rate limiting, least privilege, dependency scanning, CORS control, input validation, and security scanning are non-negotiable.

## 2. Declarative VHLL manifest standard

Every enterprise operation begins as a VHLL manifest. The manifest is a pure data structure that separates business intent from execution.

### 2.1 Manifest lifecycle

```text
objective -> manifest -> schema validation -> no-spend policy -> minify
  -> vector cache check -> complexity scoring -> route decision
  -> local script | local AI | approval queue -> verify -> security scan
  -> audit log -> memory commit -> lifelong catch and correct
```

### 2.2 Manifest schema

| Field | Type | Purpose |
|---|---|---|
| `objective` | string | Human-readable goal. |
| `process` | enum | One of the registered enterprise processes. |
| `agent` | string | The exact agent responsible for this operation. |
| `operation` | string | The deterministic operation the agent performs. |
| `inputs` | object | Normalized, validated input records. |
| `expected_outputs` | object | Declared output schema and verification rules. |
| `allowed_connectors` | string[] | Connectors the agent may touch. |
| `forbidden_actions` | string[] | Actions that immediately block the operation. |
| `approval_required` | boolean | Whether owner approval is required before execution. |
| `max_cost_usd` | number | Hard cost ceiling. Default 0. |
| `verification_rules` | string[] | How the output is verified. |
| `audit_level` | enum | `full`, `summary`, or `none` (default `full`). |

### 2.3 State machine

The ASIOS execution state machine is deterministic and immutable.

| State | Meaning |
|---|---|
| `RECEIVED` | Objective accepted and manifest created. |
| `MANIFEST_VALID` | Schema, no-spend, and security pre-checks passed. |
| `CACHE_HIT` | A verified previous result is returned without re-execution. |
| `COST_OK` | Cost guard confirms the operation is within budget. |
| `APPROVAL_REQUIRED` | External or sensitive action; blocked until owner approval. |
| `EXECUTING` | Agent function is running. |
| `VERIFYING` | Output is being verified against declared rules. |
| `COMMITTED` | Output verified and written to memory/audit. |
| `BLOCKED` | Operation failed a gate and is logged for review. |

State transitions always produce a new state object; prior states are never mutated. This is enforced by frozen dataclasses in Python and `Readonly<T>` in TypeScript.

## 3. ASI control plane

The ASI control plane is implemented in `lib/global-enterprise-orchestrator.ts` and exposed at `/api/enterprise/orchestrator`.

### 3.1 Responsibilities

- Load and validate the canonical `agents/enterprise-registry.yaml`.
- Load and validate the module declarations in `modules/*/module.yaml`.
- Receive an `operation` and `input` from the API or a scheduled runner.
- Select exactly one agent for the operation.
- Execute the agent in zero-spend, deterministic mode.
- Gate every external action through the approval boundary.
- Hand off to the next agent or to the owner approval gate.
- Emit a `proof_event` for every completed run.

### 3.2 Control plane invariants

1. One operation = one agent.
2. No agent performs another agent’s operation.
3. No agent performs an external action marked as forbidden.
4. Every operation returns `approvalRequired` and `nextAgent`.
5. Every operation writes to the audit log.
6. Every failed or blocked operation triggers a Lifelong Catch and Correct event.

## 4. Per-process agent registry

The Global Enterprise ASIOS registry maps one agent to each process. Each agent declares its allowed connectors, forbidden actions, approval-required actions, cost ceiling, and verification requirement.

| Process | Agent ID | Operation | Allowed connectors | Forbidden actions | Approval-required actions | Verifier required |
|---|---|---|---|---|---|---|
| Opportunity Intelligence | `agent_opportunity_intelligence` | `scan_opportunities` | local_files, github_read, playwright_local, public_web_search | paid_api_call, email_send, public_post, submit_application, create_external_account | external_write, paid_call, external_share | true |
| Scoring | `agent_scoring` | `score_opportunity` | local_files | any_external_write, paid_api_call | external_write, paid_call | true |
| Routing | `agent_routing` | `recommend_next_action` | local_files | any_external_action, paid_api_call | external_write, paid_call | true |
| Daily Command | `agent_daily_command` | `summarize_daily_command` | local_files, github_read, n8n_local | paid_api_call, email_send, public_post, production_deploy | external_write, paid_call, production_change | true |
| AI Operations Advisor | `agent_ai_operations_advisor` | `advise_intake` | local_files, ollama_local, playwright_local | paid_api_call, public_post, email_send | external_share, paid_call | true |
| Intake | `agent_intake` | `normalize_intake` | local_files, gmail_read, public_web_search | paid_api_call, public_post, email_send, create_external_account | external_write, paid_call, external_share | true |
| Field Network | `agent_field_network` | `sync_field_network` | local_files, github_read | paid_api_call, dispatch_technician, accept_work, public_post | external_write, paid_call, dispatch | true |
| Revenue OS | `agent_revenue_os` | `track_revenue` | local_files | paid_api_call, move_money, public_post, invoice_send | external_write, paid_call | true |
| Revenue | `agent_revenue` | `record_revenue_event` | local_files | paid_api_call, move_money, public_post | external_write, paid_call | true |
| Grant / Packet Library | `agent_grant_procurement_packet` | `prepare_packet` | local_files, document_intelligence | paid_api_call, submit_application, email_send, public_post | external_share, paid_call, production_change | true |
| Procurement / Grant Tracking | `agent_procurement_grant` | `track_funding_sources` | local_files, github_read, playwright_local, public_web_search | paid_api_call, submit_application, create_external_account, email_send | external_write, paid_call | true |
| Backend Command | `agent_backend_command` | `healthcheck_backend` | local_files, github_read | paid_api_call, production_deploy, repo_merge | external_write, paid_call, production_change | true |
| Proof | `agent_proof` | `build_proof_packet` | local_files, document_intelligence | paid_api_call, public_post, external_share | external_share, paid_call | true |
| Outreach | `agent_outreach` | `draft_outreach` | local_files | email_send, public_post, paid_api_call, create_external_account | external_share, paid_call | true |
| Compliance | `agent_compliance` | `evaluate_security_gate` | local_files | any_cost, paid_api_call, public_post | any_external_action, policy_update | true |
| Lifelong Catch and Correct | `agent_lifelong_catch_correct` | `catch_correct` | local_files | any_cost, public_post | policy_update | true |
| Super-AI Orchestrator | `super_ai_orchestrator` | `orchestrate` | all_registered_agents | any_direct_external_action, paid_api_call | any_external_action, production_change | true |

The canonical registry is stored in `agents/enterprise-registry.yaml`.

## 5. Security and trust model

### 5.1 Fail-closed enforcement

- If a manifest declares a connector or action not in the agent’s allowed/forbidden lists, the operation is BLOCKED.
- If `max_cost_usd > 0` and no explicit approval token is present, the operation is BLOCKED.
- If a verification rule fails, the output is discarded and the operation is BLOCKED.
- If a security scan finds forbidden signatures, the operation is BLOCKED.

### 5.2 Least privilege

- Agents receive only the connectors and permissions required for their single operation.
- Connectors default to `enabled: false` and are activated only per environment.
- Role-based access is enforced through `lib/rbac.ts` and module-level `requires_approval_for` lists.

### 5.3 Secret discipline

- Secrets are read from `process.env` or a vault at runtime.
- No secret is embedded in frontend bundles, prompts, screenshots, ZIP files, or Git.
- All environment variables are declared in `.env.example` without values.

### 5.4 Audit and proof

- Every agent run produces a `proof_event` with `input_hash`, `output_hash`, `agent_id`, `operation`, `approval_status`, and `receipt`.
- Audit logs are append-only JSONL.
- Memory commits are idempotent (`INSERT OR REPLACE` on a primary key).
- Corrections are logged in `LIFELONG_CATCH_AND_CORRECT.md` and propagated to the agent registry.

## 6. Data and record model

Global Enterprise ASIOS extends the canonical record model with an `enterprise_operation_runs` table.

| Table / record type | Purpose |
|---|---|
| `enterprise_operation_runs` | Each dispatched operation: objective, manifest, agent, operation, input_hash, output_hash, state, approval_status, receipt, timestamp. |
| `enterprise_manifests` | Declarative VHLL manifests awaiting or after execution. |
| `enterprise_agents` | Runtime view of `agents/enterprise-registry.yaml` for health and governance queries. |
| `enterprise_modules` | Runtime view of `modules/*/module.yaml` for health and governance queries. |
| `enterprise_connectors` | Runtime view of `connectors/registry.yaml` plus `connectors/enterprise-connectors.yaml`. |

All other tables (`accounts`, `contacts`, `opportunities`, `dispatch_leads`, `rfqs`, `proof_events`, `closeouts`, `outreach_drafts`, `compliance_flags`, `agent_runs`, `revenue_events`, `system_events`) remain unchanged and are documented in the master build record.

## 7. Deployment and operations

### 7.1 Module healthchecks

Every module in `modules/*/module.yaml` declares a `healthcheck`. The orchestrator can iterate over modules and call each healthcheck endpoint to prove liveness.

Example healthcheck declaration:

```yaml
healthcheck:
  path: /api/enterprise/orchestrator?operation=healthcheck_backend&source=business-os
  port: 3000
  method: GET
  expected_status: 200
```

### 7.2 CI/CD gates

The build must pass the following gates before any module is treated as production ready:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run test`
- `python -m pytest tests/`
- `npm run qa:content`
- `npm run qa:seo`
- `npm run qa:gate`
- `node scripts/agent-healthcheck.mjs`

### 7.3 Runtime targets

| Layer | Target |
|---|---|
| Public site | Vercel (`www.alreadyherellc.com`) |
| API routes | Next.js App Router + Edge/Vercel Functions |
| Sovereign core | Python runtime on OCI Always Free / VPS via Docker Compose |
| Database | SQLite WAL (`data/`) with Litestream replication |
| AI fallback | Local Ollama; cloud only after cost approval |
| Reverse proxy | Caddy or Nginx with automatic TLS |

### 7.4 Backup and recovery

- SQLite databases are replicated with Litestream to object storage.
- Exported packets (DOCX/PDF/ZIP/CSV/JSON) are written to `exports/` and versioned.
- Audit logs are append-only JSONL and rotated daily.
- Recovery drills are run monthly.

## 8. Production readiness checklist

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

## 9. Appendix: VHLL manifest example

```yaml
manifest:
  version: "1.0.0"
  objective: "Score a new municipal RFI for field-service fit"
  process: opportunity_intelligence
  agent: agent_opportunity_intelligence
  operation: scan_opportunities
  inputs:
    title: "City of Mesa IT support RFI"
    source: "mesa.gov"
    amount: 0
    deadline: "2026-09-01"
    documents:
      - scope.pdf
  expected_outputs:
    score: number
    recommendation: string
    next_action: string
  allowed_connectors:
    - local_files
    - public_web_search
  forbidden_actions:
    - paid_api_call
    - submit_application
    - email_send
  approval_required: true
  max_cost_usd: 0
  verification_rules:
    - "score must be between 0 and 100"
    - "recommendation must be one of: proceed, conditional, team, counter, suppress"
  audit_level: full
```

The orchestrator compiles this manifest, routes it to `agent_opportunity_intelligence`, and returns a `proof_event` with `recommendation`, `next_action`, and `approval_required`.
