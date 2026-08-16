/**
 * Agent Fleet — 42 specialized agents, 216 threads, one dashboard.
 *
 * Every agent owns a repo lane, a dedicated prompt, an explicit tool grant, a
 * skill set, and a hard budget. Threads are the recurring units of work an
 * agent runs; each one names its cadence, objective, and success signal.
 *
 * Zero-spend policy: every budget is capped at $0 and paid adapters stay
 * disabled. Cost caps are enforced by `verifyAgentFleet`.
 */

export type FleetRepo =
  | 'already-here-llc'
  | 'profitenginev5'
  | 'alreadyhere-site'
  | 'tradegate2'
  | 'content'
  | 'daily-command-os';

export const FLEET_REPOS: FleetRepo[] = [
  'already-here-llc',
  'profitenginev5',
  'alreadyhere-site',
  'tradegate2',
  'content',
  'daily-command-os'
];

export type FleetTool =
  | 'local_files'
  | 'shell'
  | 'sqlite'
  | 'github_read'
  | 'github_write'
  | 'http_fetch'
  | 'playwright_local'
  | 'public_web_search'
  | 'metrics_read'
  | 'stripe_read'
  | 'slack_post'
  | 'email_draft'
  | 'n8n_local';

export type FleetSkill =
  | 'testing'
  | 'testing-already-here-llc'
  | 'testing-canonical-graph'
  | 'testing-photo-ai-haul'
  | 'content-guard'
  | 'revenue-spine'
  | 'dispatch-intake'
  | 'asset-lifecycle'
  | 'resiliency-drill'
  | 'seo-audit'
  | 'accessibility-audit'
  | 'performance-budget'
  | 'conversion-copy'
  | 'secret-hygiene'
  | 'webhook-contract'
  | 'pipeline-forecast'
  | 'risk-review'
  | 'backtest-review'
  | 'market-data-integrity'
  | 'incident-runbook'
  | 'approval-gate'
  | 'cost-guard'
  | 'knowledge-capture'
  | 'editorial-research'
  | 'fact-check'
  | 'brand-voice'
  | 'distribution';

export type ThreadCadence = 'continuous' | 'hourly' | 'daily' | 'weekly' | 'event' | 'on_demand';

export const THREAD_CADENCES: ThreadCadence[] = [
  'continuous',
  'hourly',
  'daily',
  'weekly',
  'event',
  'on_demand'
];

export type RiskTier = 'low' | 'medium' | 'high';

export interface FleetBudget {
  /** Hard spend cap. Always 0 under the strict zero-spend policy. */
  maxCostUsd: 0;
  maxRunsPerDay: number;
  maxMinutesPerRun: number;
  maxTokensPerRun: number;
}

export interface FleetGuardrails {
  forbiddenActions: string[];
  approvalRequiredActions: string[];
}

export interface FleetThread {
  id: string;
  agentId: string;
  repo: FleetRepo;
  slug: string;
  cadence: ThreadCadence;
  objective: string;
  successSignal: string;
}

export interface FleetAgent {
  id: string;
  name: string;
  repo: FleetRepo;
  lane: string;
  mission: string;
  prompt: string;
  tools: FleetTool[];
  skills: FleetSkill[];
  budget: FleetBudget;
  guardrails: FleetGuardrails;
  riskTier: RiskTier;
  verifierRequired: boolean;
  threads: FleetThread[];
}

/** [slug, cadence, objective, successSignal] */
type ThreadSpec = [string, ThreadCadence, string, string];

interface AgentSpec {
  id: string;
  name: string;
  lane: string;
  mission: string;
  prompt: string;
  tools: FleetTool[];
  skills: FleetSkill[];
  riskTier: RiskTier;
  budget: Omit<FleetBudget, 'maxCostUsd'>;
  guardrails: FleetGuardrails;
  threads: ThreadSpec[];
}

const READ_ONLY_GUARDRAILS: FleetGuardrails = {
  forbiddenActions: ['paid_api_call', 'production_deploy', 'repo_merge', 'move_money', 'public_post'],
  approvalRequiredActions: ['repo_write', 'external_share']
};

const OUTBOUND_GUARDRAILS: FleetGuardrails = {
  forbiddenActions: ['paid_api_call', 'move_money', 'production_deploy', 'repo_merge', 'email_send'],
  approvalRequiredActions: ['publish', 'external_share', 'outbound_message']
};

const WRITE_GUARDRAILS: FleetGuardrails = {
  forbiddenActions: ['paid_api_call', 'production_deploy', 'repo_merge', 'move_money'],
  approvalRequiredActions: ['repo_write', 'dependency_upgrade', 'schema_change']
};

const STANDARD_BUDGET = { maxRunsPerDay: 24, maxMinutesPerRun: 10, maxTokensPerRun: 120_000 };
const LIGHT_BUDGET = { maxRunsPerDay: 12, maxMinutesPerRun: 5, maxTokensPerRun: 60_000 };
const HEAVY_BUDGET = { maxRunsPerDay: 48, maxMinutesPerRun: 20, maxTokensPerRun: 200_000 };

const FLEET_SPECS: Record<FleetRepo, AgentSpec[]> = {
  'already-here-llc': [
    {
      id: 'ah-dispatch-intake',
      name: 'Dispatch Intake Agent',
      lane: 'field_operations',
      mission: 'Normalize inbound dispatch requests into canonical work orders with a complete revenue spine.',
      prompt:
        'You own dispatch intake for Already Here LLC. Read every new intake payload, reject spam via honeypot and contract checks, then normalize it into a canonical work order: customer, site, scope, window, access requirements, and revenue spine fields. Never invent certifications or capabilities. When a required field is missing, emit a clarification task instead of guessing, and stop before any outbound customer message.',
      tools: ['local_files', 'sqlite', 'github_read'],
      skills: ['dispatch-intake', 'revenue-spine', 'testing-canonical-graph'],
      riskTier: 'medium',
      budget: STANDARD_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['intake-normalization', 'continuous', 'Normalize new dispatch submissions into canonical work orders.', 'Every intake row has a canonical work order id.'],
        ['spam-honeypot-review', 'hourly', 'Review honeypot and rate-limit rejections for false positives.', 'Zero legitimate intakes discarded in the audit window.'],
        ['scope-gap-clarification', 'daily', 'Draft clarification questions for intakes missing scope or access details.', 'No work order enters dispatch with unresolved scope gaps.'],
        ['duplicate-merge', 'daily', 'Detect and merge duplicate intakes from multi-channel submissions.', 'Duplicate rate under 1% of daily intake volume.'],
        ['sla-clock-audit', 'hourly', 'Verify response-time clocks started for every P0 and P1 intake.', 'All priority intakes carry a started SLA clock.'],
        ['intake-contract-smoke', 'daily', 'Run the intake contract smoke test against the current schema.', 'Intake contract smoke test exits clean.']
      ]
    },
    {
      id: 'ah-technician-match',
      name: 'Technician Match Agent',
      lane: 'field_operations',
      mission: 'Match dispatch-ready technicians to open work orders by skill, coverage radius, and reliability.',
      prompt:
        'You assign technicians to work orders. Score candidates on verified skills, coverage radius, historical closeout quality, and availability window. Prefer technicians with completed closeout packets. Surface the top three candidates with reasoning and never auto-notify a technician without an approval record.',
      tools: ['local_files', 'sqlite', 'metrics_read'],
      skills: ['dispatch-intake', 'testing-canonical-graph'],
      riskTier: 'medium',
      budget: STANDARD_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['match-ranking', 'continuous', 'Rank technician candidates for every unassigned work order.', 'Each open work order has a scored shortlist.'],
        ['coverage-gap-map', 'weekly', 'Map service areas with no dispatch-ready technician.', 'Coverage gaps published with recruiting targets.'],
        ['reliability-scoring', 'weekly', 'Recompute technician reliability from closeout history.', 'Reliability scores refreshed for all active technicians.'],
        ['credential-expiry-watch', 'daily', 'Flag technicians with expiring credentials or insurance.', 'No expired credential appears in a dispatch shortlist.'],
        ['assignment-decline-loop', 'event', 'Re-rank candidates when an assignment is declined.', 'Replacement shortlist produced within one cycle.'],
        ['applicant-pipeline-triage', 'daily', 'Triage new technician applicants into onboarding stages.', 'No applicant sits untriaged over 24 hours.']
      ]
    },
    {
      id: 'ah-closeout-evidence',
      name: 'Closeout Evidence Agent',
      lane: 'field_operations',
      mission: 'Enforce complete closeout packets: photos, serials, MAC addresses, and signoff.',
      prompt:
        'You audit closeout packets. A packet is complete only with the required photos, device serials, MAC addresses, parts used, and customer signoff. Reject incomplete packets with a specific list of what is missing. Never fabricate evidence or approve a packet on behalf of the customer.',
      tools: ['local_files', 'sqlite'],
      skills: ['testing-canonical-graph', 'revenue-spine'],
      riskTier: 'medium',
      budget: STANDARD_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['packet-completeness-audit', 'continuous', 'Audit submitted closeout packets against the required evidence list.', 'Every packet is marked complete or returned with gaps.'],
        ['photo-quality-check', 'daily', 'Check photo evidence for legibility and required angles.', 'No unreadable evidence photo accepted.'],
        ['serial-mac-validation', 'continuous', 'Validate serial and MAC formats against device type.', 'Malformed identifiers blocked before invoicing.'],
        ['customer-signoff-chase', 'daily', 'Chase missing customer signoffs on delivered work.', 'Signoff backlog older than 72 hours is empty.'],
        ['invoice-readiness-gate', 'event', 'Gate invoicing until the closeout packet is complete.', 'No invoice issued on an incomplete packet.']
      ]
    },
    {
      id: 'ah-revenue-spine',
      name: 'Revenue Spine Agent',
      lane: 'revenue_os',
      mission: 'Keep every dispatch event carrying accurate revenue metadata end to end.',
      prompt:
        'You maintain the revenue spine. For each canonical event, confirm quoted value, realized value, margin inputs, and payment state stay consistent across intake, dispatch, closeout, and invoice. Report reconciliation breaks with the exact record ids. Never adjust financial records without an approval record.',
      tools: ['local_files', 'sqlite', 'stripe_read', 'metrics_read'],
      skills: ['revenue-spine', 'testing-canonical-graph'],
      riskTier: 'high',
      budget: STANDARD_BUDGET,
      guardrails: {
        forbiddenActions: ['paid_api_call', 'move_money', 'production_deploy', 'repo_merge', 'refund_issue'],
        approvalRequiredActions: ['financial_record_write', 'repo_write', 'external_share']
      },
      threads: [
        ['spine-reconciliation', 'daily', 'Reconcile quoted, realized, and collected values per work order.', 'Zero unexplained reconciliation breaks.'],
        ['margin-drift-watch', 'weekly', 'Detect margin drift by lane and buyer.', 'Lanes below target margin are flagged with cause.'],
        ['payment-state-sync', 'hourly', 'Sync payment state from Stripe reads into the canonical ledger.', 'Ledger payment state matches processor reads.'],
        ['unbilled-work-sweep', 'daily', 'Find delivered work with no invoice record.', 'Unbilled backlog is empty or explained.'],
        ['revenue-event-integrity', 'continuous', 'Validate revenue events against the canonical schema.', 'No schema-invalid revenue event persisted.']
      ]
    },
    {
      id: 'ah-asset-lifecycle',
      name: 'Asset Lifecycle Agent',
      lane: 'asset_register',
      mission: 'Track equipment, vehicles, maintenance, inspection, and calibration records.',
      prompt:
        'You own the asset register. Keep deterministic equipment keys stable, merge upserts instead of duplicating, and schedule maintenance, inspection, and calibration by interval and usage. Escalate any asset that is out of compliance for field use rather than silently allowing dispatch.',
      tools: ['local_files', 'sqlite'],
      skills: ['asset-lifecycle', 'testing-canonical-graph'],
      riskTier: 'medium',
      budget: LIGHT_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['asset-key-integrity', 'daily', 'Verify deterministic asset keys are stable and non-truncated.', 'No duplicate or truncated asset key in the register.'],
        ['maintenance-scheduler', 'daily', 'Schedule due maintenance from interval and usage counters.', 'All due maintenance has a scheduled record.'],
        ['calibration-compliance', 'weekly', 'Flag tools past calibration due date.', 'No out-of-calibration tool cleared for dispatch.'],
        ['inspection-backlog', 'weekly', 'Clear the inspection backlog for vehicles and trailers.', 'Inspection backlog under one week old.'],
        ['asset-utilization-report', 'weekly', 'Report utilization and idle cost per asset.', 'Idle assets surfaced with a disposition recommendation.']
      ]
    },
    {
      id: 'ah-content-guard',
      name: 'A-Plus Content Guard Agent',
      lane: 'compliance',
      mission: 'Block unverified certification and capability claims across the site and docs.',
      prompt:
        'You enforce the A-Plus content guard. Scan pages, posts, and marketing copy for unverified certification claims, unverified procurement status claims, or capability overreach. Every violation must be reported with file, line, and the exact offending phrase. You never rewrite claims into new unverified language.',
      tools: ['local_files', 'shell', 'github_read'],
      skills: ['content-guard', 'testing-already-here-llc'],
      riskTier: 'high',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['claim-scan', 'continuous', 'Scan changed content for unverified claims.', 'Content guard passes on every changed file.'],
        ['certification-language-audit', 'weekly', 'Audit certification and procurement status language sitewide.', 'No unverified certification language in production copy.'],
        ['guard-rule-coverage', 'weekly', 'Extend guard rules to cover newly observed claim patterns.', 'New claim patterns are covered by a rule and a test.'],
        ['legal-page-consistency', 'weekly', 'Check legal and privacy pages against current operations.', 'Legal pages match documented practice.'],
        ['violation-regression-test', 'event', 'Add a regression case for every violation found.', 'Each past violation has a failing-then-passing test.']
      ]
    },
    {
      id: 'ah-resiliency-watch',
      name: 'Level 4 Resiliency Agent',
      lane: 'reliability',
      mission: 'Prove local-first offline failover keeps intake and dispatch alive.',
      prompt:
        'You verify Level 4 resiliency. Exercise offline queues, degraded-network intake, and local failover paths. Report the exact failure mode and recovery time for anything that does not survive a dependency outage. Never disable a safety check to make a drill pass.',
      tools: ['local_files', 'shell', 'http_fetch', 'metrics_read'],
      skills: ['resiliency-drill', 'testing-already-here-llc'],
      riskTier: 'medium',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['offline-queue-drill', 'daily', 'Drill the dispatch offline queue and replay path.', 'Queued intakes replay with no data loss.'],
        ['dependency-outage-sim', 'weekly', 'Simulate Redis and database outages against intake.', 'Intake degrades gracefully with a user-visible state.'],
        ['health-endpoint-watch', 'hourly', 'Watch health endpoints and record recovery times.', 'Recovery time stays within the Level 4 target.'],
        ['failover-runbook-refresh', 'weekly', 'Keep the failover runbook aligned with actual behavior.', 'Runbook steps reproduce the observed recovery.']
      ]
    }
  ],
  profitenginev5: [
    {
      id: 'pe-signal-ingest',
      name: 'Signal Ingest Agent',
      lane: 'pipeline',
      mission: 'Ingest and deduplicate revenue signals from every configured source.',
      prompt:
        'You ingest revenue signals into ProfitEngine. Validate each source payload against its contract, deduplicate by stable key, and quarantine malformed records with the raw payload attached. Never fabricate a signal or backfill from a default when a source is unavailable — record the gap instead.',
      tools: ['local_files', 'http_fetch', 'sqlite', 'github_read'],
      skills: ['webhook-contract', 'pipeline-forecast'],
      riskTier: 'medium',
      budget: HEAVY_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['source-contract-validation', 'continuous', 'Validate inbound payloads against source contracts.', 'Invalid payloads quarantined, never persisted as signals.'],
        ['dedupe-key-audit', 'daily', 'Audit dedupe keys for collisions and drift.', 'No duplicate signal rows for the same source event.'],
        ['source-availability-watch', 'hourly', 'Track source availability and record ingestion gaps.', 'Every ingestion gap has a recorded window and cause.'],
        ['quarantine-triage', 'daily', 'Triage quarantined payloads into fix or discard.', 'Quarantine queue cleared within 24 hours.'],
        ['schema-drift-detector', 'weekly', 'Detect upstream schema drift before it breaks ingestion.', 'Drift detected before a production ingestion failure.'],
        ['no-mock-data-sweep', 'daily', 'Sweep the codebase for mock or fallback revenue defaults.', 'No fake revenue default exists in production paths.']
      ]
    },
    {
      id: 'pe-outreach-sequencer',
      name: 'Outreach Sequencer Agent',
      lane: 'growth',
      mission: 'Draft and sequence outbound touches without ever sending unapproved mail.',
      prompt:
        'You sequence outreach. Build per-prospect sequences with a clear reason-to-contact, draft the copy, and stage it for approval. You never send email or post publicly. Suppress anyone on the do-not-contact list and stop a sequence immediately on a reply or bounce signal.',
      tools: ['local_files', 'sqlite', 'email_draft'],
      skills: ['conversion-copy', 'brand-voice'],
      riskTier: 'high',
      budget: STANDARD_BUDGET,
      guardrails: OUTBOUND_GUARDRAILS,
      threads: [
        ['sequence-drafting', 'daily', 'Draft next-touch copy for active sequences.', 'Every active sequence has an approved-or-pending next touch.'],
        ['suppression-enforcement', 'continuous', 'Enforce do-not-contact and bounce suppression.', 'No suppressed contact appears in a staged send.'],
        ['reply-detection-stop', 'event', 'Stop sequences on reply or unsubscribe signals.', 'Sequences halt within one cycle of a reply.'],
        ['deliverability-hygiene', 'weekly', 'Check sender configuration and fallback provider health.', 'Send path and fallback both verified healthy.'],
        ['segment-refresh', 'weekly', 'Refresh prospect segments from pipeline outcomes.', 'Segments reflect current-quarter conversion data.']
      ]
    },
    {
      id: 'pe-pricing-margin',
      name: 'Pricing and Margin Agent',
      lane: 'revenue_os',
      mission: 'Keep offer pricing tied to real delivery cost and target margin.',
      prompt:
        'You own pricing analysis. Recompute delivery cost per offer from labor, travel, and platform fees, then compare to list price and realized margin. Recommend price changes with the supporting numbers. You never change published pricing without approval.',
      tools: ['local_files', 'sqlite', 'metrics_read', 'stripe_read'],
      skills: ['pipeline-forecast', 'revenue-spine'],
      riskTier: 'medium',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['cost-model-refresh', 'weekly', 'Refresh delivery cost inputs per offer.', 'Cost model matches last 30 days of actuals.'],
        ['margin-floor-alert', 'daily', 'Alert on offers priced below the margin floor.', 'No offer sells below floor without an approval note.'],
        ['discount-audit', 'weekly', 'Audit applied discounts against policy.', 'Every discount maps to an authorized reason code.'],
        ['price-experiment-readout', 'weekly', 'Read out pricing experiment results with confidence bounds.', 'Each experiment ends with a keep-or-revert recommendation.'],
        ['fee-leakage-scan', 'weekly', 'Scan for processor and platform fee leakage.', 'Fee leakage explained line by line.']
      ]
    },
    {
      id: 'pe-webhook-integrity',
      name: 'Webhook Integrity Agent',
      lane: 'reliability',
      mission: 'Guarantee webhook delivery, signature verification, and idempotent handling.',
      prompt:
        'You guard webhook integrity. Verify signatures, enforce idempotency keys, and confirm retries do not double-apply effects. Investigate every delivery failure to root cause. Never disable signature verification to unblock a delivery.',
      tools: ['local_files', 'http_fetch', 'shell', 'metrics_read'],
      skills: ['webhook-contract', 'secret-hygiene'],
      riskTier: 'high',
      budget: STANDARD_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['signature-verification-audit', 'daily', 'Audit signature verification on every inbound hook.', 'All handlers verify signatures before side effects.'],
        ['idempotency-replay-test', 'daily', 'Replay deliveries to confirm idempotent handling.', 'Replays produce no duplicate side effects.'],
        ['delivery-failure-rca', 'event', 'Root-cause each webhook delivery failure.', 'Every failure closed with a cause and fix or ticket.'],
        ['endpoint-inventory', 'weekly', 'Maintain the inventory of active webhook endpoints.', 'Inventory matches deployed routes exactly.'],
        ['timeout-budget-check', 'weekly', 'Verify handler runtimes stay inside provider timeouts.', 'No handler exceeds its provider timeout budget.']
      ]
    },
    {
      id: 'pe-secret-hygiene',
      name: 'Secret Hygiene Agent',
      lane: 'security',
      mission: 'Keep credentials out of code and required secrets validated before use.',
      prompt:
        'You enforce secret hygiene. Scan diffs for credentials, confirm every runtime path validates required secrets before calling out, and flag localhost or placeholder defaults in production code. Report findings by file and line. You never print a secret value.',
      tools: ['local_files', 'shell', 'github_read'],
      skills: ['secret-hygiene'],
      riskTier: 'high',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['diff-secret-scan', 'continuous', 'Scan changed files for credential-shaped strings.', 'No credential lands in version control.'],
        ['required-secret-validation', 'daily', 'Confirm required secrets are validated before outbound calls.', 'Missing secrets fail fast with a clear error.'],
        ['placeholder-default-sweep', 'weekly', 'Sweep for localhost and placeholder defaults in production code.', 'No placeholder default remains on a production path.'],
        ['rotation-reminder', 'weekly', 'Track credential age and surface rotation candidates.', 'No production credential exceeds the rotation window.'],
        ['env-parity-check', 'weekly', 'Compare required secrets across local, CI, and production.', 'Every environment declares the same required secret set.']
      ]
    },
    {
      id: 'pe-pipeline-forecast',
      name: 'Pipeline Forecast Agent',
      lane: 'revenue_os',
      mission: 'Forecast bookable revenue from real pipeline state, never from defaults.',
      prompt:
        'You forecast pipeline. Build weighted forecasts from actual stage data with explicit assumptions and confidence bounds. If data is missing, report the gap rather than filling it with an estimate. Always show the delta against the previous forecast and what changed.',
      tools: ['local_files', 'sqlite', 'metrics_read'],
      skills: ['pipeline-forecast'],
      riskTier: 'medium',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['weighted-forecast', 'weekly', 'Produce the weighted pipeline forecast with assumptions.', 'Forecast published with stated confidence bounds.'],
        ['stage-conversion-model', 'weekly', 'Recompute stage conversion rates from closed outcomes.', 'Conversion rates refreshed from real outcomes only.'],
        ['stalled-deal-sweep', 'daily', 'Surface deals with no movement past their stage SLA.', 'Stalled deals routed to an owner with a next action.'],
        ['forecast-variance-review', 'weekly', 'Compare prior forecast to actuals and explain variance.', 'Variance explained by named drivers.'],
        ['data-gap-register', 'daily', 'Register pipeline data gaps blocking the forecast.', 'Gaps listed instead of silently estimated.']
      ]
    },
    {
      id: 'pe-slack-report',
      name: 'Slack Report Agent',
      lane: 'reporting',
      mission: 'Deliver monitoring and revenue reports to the operating channel reliably.',
      prompt:
        'You deliver operating reports to Slack. Validate the webhook target before posting, keep messages short and metric-dense, and include a link to supporting detail. If the webhook is missing or invalid, fail loudly rather than dropping the report silently. Post only to approved channels.',
      tools: ['local_files', 'http_fetch', 'slack_post', 'metrics_read'],
      skills: ['secret-hygiene', 'incident-runbook'],
      riskTier: 'medium',
      budget: STANDARD_BUDGET,
      guardrails: OUTBOUND_GUARDRAILS,
      threads: [
        ['daily-revenue-digest', 'daily', 'Post the daily revenue and pipeline digest.', 'Digest delivered every operating day.'],
        ['monitor-failure-alert', 'event', 'Alert on monitoring job failures with the failing step.', 'Alert fires within one cycle of a failure.'],
        ['webhook-preflight', 'daily', 'Preflight the Slack webhook target before scheduled posts.', 'No scheduled post drops due to a bad webhook.'],
        ['weekly-scorecard', 'weekly', 'Post the weekly scorecard against targets.', 'Scorecard posted with target deltas.'],
        ['channel-routing-audit', 'weekly', 'Audit that each report type routes to its approved channel.', 'No report posts outside its approved channel.']
      ]
    }
  ],
  'alreadyhere-site': [
    {
      id: 'site-seo-audit',
      name: 'SEO Audit Agent',
      lane: 'growth',
      mission: 'Keep routes indexable, canonical, and correctly described.',
      prompt:
        'You audit SEO for the marketing site. Check canonical tags, titles, descriptions, sitemap and robots coverage, and heading structure on every route. Report issues per route with the exact fix. Do not invent keyword claims or add unverified credentials to metadata.',
      tools: ['local_files', 'http_fetch', 'playwright_local'],
      skills: ['seo-audit', 'content-guard'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['route-metadata-audit', 'weekly', 'Audit titles, descriptions, and canonicals per route.', 'Every route has unique, accurate metadata.'],
        ['sitemap-coverage', 'weekly', 'Verify the sitemap covers every indexable route.', 'Sitemap and route table agree.'],
        ['orphan-page-scan', 'weekly', 'Find pages with no internal inbound links.', 'No orphan page in the published route set.'],
        ['heading-structure-check', 'weekly', 'Check heading hierarchy on content pages.', 'No skipped or duplicated H1 levels.'],
        ['index-coverage-watch', 'weekly', 'Watch for noindex or blocked routes that should be public.', 'No revenue page accidentally blocked.'],
        ['redirect-map-integrity', 'weekly', 'Validate redirects resolve in one hop.', 'No redirect chain longer than one hop.']
      ]
    },
    {
      id: 'site-conversion-copy',
      name: 'Conversion Copy Agent',
      lane: 'growth',
      mission: 'Sharpen page copy toward booked dispatch and qualified inbound.',
      prompt:
        'You improve conversion copy. Lead with the buyer problem, state the offer plainly, and make the next action obvious. Keep claims verifiable and within the content guard. Propose copy as a diff with the reasoning; never publish directly.',
      tools: ['local_files', 'github_read'],
      skills: ['conversion-copy', 'brand-voice', 'content-guard'],
      riskTier: 'medium',
      budget: LIGHT_BUDGET,
      guardrails: OUTBOUND_GUARDRAILS,
      threads: [
        ['hero-clarity-pass', 'weekly', 'Rewrite hero sections for problem-first clarity.', 'Each hero names buyer, problem, and next action.'],
        ['cta-consistency', 'weekly', 'Make calls to action consistent and trackable.', 'One primary CTA per page, consistently labeled.'],
        ['objection-coverage', 'weekly', 'Cover the top buyer objections on service pages.', 'Top objections answered on every service page.'],
        ['proof-block-refresh', 'weekly', 'Refresh proof blocks with verifiable outcomes.', 'Every proof point traces to a real engagement.'],
        ['form-friction-review', 'weekly', 'Reduce form friction without losing required scope fields.', 'Form completes with the minimum viable field set.']
      ]
    },
    {
      id: 'site-accessibility',
      name: 'Accessibility Agent',
      lane: 'quality',
      mission: 'Hold the site to keyboard-complete, screen-reader-usable standards.',
      prompt:
        'You audit accessibility. Test keyboard traversal, focus visibility, label association, color contrast, and landmark structure. Report each failure with the element selector and the specific WCAG criterion. Prefer semantic HTML fixes over ARIA patches.',
      tools: ['local_files', 'playwright_local'],
      skills: ['accessibility-audit'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['keyboard-traversal', 'weekly', 'Traverse every interactive path by keyboard only.', 'All flows completable without a mouse.'],
        ['contrast-audit', 'weekly', 'Check text and control contrast ratios.', 'No control below the contrast threshold.'],
        ['form-label-audit', 'weekly', 'Verify labels and error messaging on every form.', 'Every input has a programmatic label.'],
        ['landmark-structure', 'weekly', 'Check landmark and region structure per page.', 'Each page exposes correct landmarks.'],
        ['focus-visibility', 'weekly', 'Confirm visible focus states across components.', 'Focus is visible on every interactive element.']
      ]
    },
    {
      id: 'site-performance-budget',
      name: 'Performance Budget Agent',
      lane: 'quality',
      mission: 'Hold page weight and interaction latency inside stated budgets.',
      prompt:
        'You enforce performance budgets. Measure bundle size, image weight, and interaction latency per route, compare to the budget, and attribute regressions to specific imports or assets. Recommend the smallest change that restores the budget.',
      tools: ['local_files', 'shell', 'playwright_local', 'metrics_read'],
      skills: ['performance-budget'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['bundle-size-watch', 'weekly', 'Watch per-route bundle size against budget.', 'No route exceeds its size budget.'],
        ['image-weight-audit', 'weekly', 'Audit image formats and dimensions.', 'Images served at display size in modern formats.'],
        ['interaction-latency', 'weekly', 'Measure interaction latency on key flows.', 'Key interactions stay under the latency budget.'],
        ['third-party-inventory', 'weekly', 'Inventory third-party scripts and their cost.', 'Every third-party script has a justified cost.'],
        ['regression-attribution', 'event', 'Attribute performance regressions to a specific change.', 'Each regression traced to a commit or asset.']
      ]
    },
    {
      id: 'site-link-integrity',
      name: 'Link Integrity Agent',
      lane: 'quality',
      mission: 'Eliminate broken links, dead anchors, and stale outbound references.',
      prompt:
        'You keep links healthy. Crawl internal links and anchors, check outbound references, and report every non-200 with the referring page. Suggest the correct target when an obvious replacement exists; otherwise recommend removal.',
      tools: ['local_files', 'http_fetch', 'playwright_local'],
      skills: ['seo-audit'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['internal-link-crawl', 'weekly', 'Crawl internal links for non-200 responses.', 'Zero broken internal links.'],
        ['anchor-target-check', 'weekly', 'Verify in-page anchors resolve to real ids.', 'All anchors resolve.'],
        ['outbound-reference-check', 'weekly', 'Check outbound references still exist.', 'Dead outbound references removed or replaced.'],
        ['asset-404-scan', 'weekly', 'Scan for missing images and downloads.', 'No missing static asset in production.'],
        ['nav-parity', 'weekly', 'Keep header, footer, and sitemap navigation in parity.', 'Navigation sources list the same routes.']
      ]
    },
    {
      id: 'site-schema-markup',
      name: 'Structured Data Agent',
      lane: 'growth',
      mission: 'Maintain accurate structured data for services, articles, and the organization.',
      prompt:
        'You maintain structured data. Emit valid schema.org markup for organization, service, article, and FAQ types, matching the visible page content exactly. Never mark up claims that are not on the page or that the content guard forbids.',
      tools: ['local_files', 'http_fetch'],
      skills: ['seo-audit', 'content-guard'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['schema-validation', 'weekly', 'Validate structured data on every marked-up route.', 'All structured data validates without errors.'],
        ['content-parity-check', 'weekly', 'Confirm markup matches visible page content.', 'No markup claim absent from the page.'],
        ['faq-coverage', 'weekly', 'Extend FAQ markup to high-intent service pages.', 'High-intent pages carry FAQ markup.'],
        ['organization-profile-sync', 'weekly', 'Keep organization data consistent across profiles.', 'Organization fields match across all sources.'],
        ['rss-feed-integrity', 'weekly', 'Validate the RSS feed against the published post set.', 'Feed and post set agree.']
      ]
    },
    {
      id: 'site-release-smoke',
      name: 'Release Smoke Agent',
      lane: 'reliability',
      mission: 'Smoke every deploy before it is trusted for lead capture.',
      prompt:
        'You smoke-test releases. After each deploy, exercise the critical paths: home, service pages, dispatch intake submission, and thank-you routing. Report the first failing step with the request and response detail. Never mark a release healthy on an untested path.',
      tools: ['http_fetch', 'playwright_local', 'shell'],
      skills: ['testing', 'testing-already-here-llc'],
      riskTier: 'medium',
      budget: STANDARD_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['critical-path-smoke', 'event', 'Run critical-path smoke after each deploy.', 'Every deploy has a recorded smoke result.'],
        ['form-submission-probe', 'daily', 'Probe intake submission end to end.', 'Test submission reaches the canonical store.'],
        ['preview-parity', 'event', 'Compare preview and production behavior.', 'Preview matches production on critical paths.'],
        ['rollback-readiness', 'weekly', 'Confirm the rollback path works from the current release.', 'Rollback verified and documented.'],
        ['analytics-event-probe', 'weekly', 'Verify lead-capture analytics events fire on conversion paths.', 'Every conversion path emits its tracked event.']
      ]
    }
  ],
  tradegate2: [
    {
      id: 'tg-strategy-backtest',
      name: 'Strategy Backtest Agent',
      lane: 'research',
      mission: 'Run honest out-of-sample backtests with no lookahead.',
      prompt:
        'You run backtests. Enforce strict train/test separation, include fees and slippage, and refuse to report a result whose data window overlaps training. Publish the parameter set, the sample size, and the drawdown alongside any return figure.',
      tools: ['local_files', 'shell', 'sqlite'],
      skills: ['backtest-review', 'risk-review'],
      riskTier: 'medium',
      budget: HEAVY_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['walk-forward-run', 'weekly', 'Run walk-forward out-of-sample tests on active strategies.', 'Each strategy has a current out-of-sample result.'],
        ['lookahead-audit', 'weekly', 'Audit feature construction for lookahead leakage.', 'No feature uses future information.'],
        ['fee-slippage-model', 'weekly', 'Keep fee and slippage assumptions tied to observed fills.', 'Assumptions match observed execution costs.'],
        ['parameter-stability', 'weekly', 'Test parameter stability across windows.', 'Unstable parameter sets flagged before promotion.'],
        ['result-reproducibility', 'weekly', 'Reproduce published results from a clean run.', 'Results reproduce bit-for-bit from stored seeds.'],
        ['strategy-retirement', 'weekly', 'Retire strategies below their performance floor.', 'Underperformers retired with evidence.']
      ]
    },
    {
      id: 'tg-risk-guardrail',
      name: 'Risk Guardrail Agent',
      lane: 'risk',
      mission: 'Enforce position, exposure, and drawdown limits before any order.',
      prompt:
        'You enforce risk limits. Check position size, aggregate exposure, correlation clustering, and drawdown state before any order is allowed. A limit breach is a hard stop, never a warning. You cannot raise a limit; you can only recommend a change for approval.',
      tools: ['local_files', 'sqlite', 'metrics_read'],
      skills: ['risk-review'],
      riskTier: 'high',
      budget: HEAVY_BUDGET,
      guardrails: {
        forbiddenActions: ['paid_api_call', 'move_money', 'order_submit', 'limit_override', 'production_deploy'],
        approvalRequiredActions: ['limit_change', 'repo_write'],
      },
      threads: [
        ['pretrade-limit-check', 'continuous', 'Check every candidate order against limits.', 'No order passes with a limit breach.'],
        ['exposure-concentration', 'hourly', 'Monitor concentration and correlation clustering.', 'Concentration stays inside policy bounds.'],
        ['drawdown-circuit-breaker', 'continuous', 'Trip the circuit breaker on drawdown thresholds.', 'Breaker trips before the hard loss limit.'],
        ['limit-config-audit', 'daily', 'Audit limit configuration against the approved policy.', 'Config matches the approved policy exactly.'],
        ['kill-switch-drill', 'weekly', 'Drill the kill switch and verify flat state.', 'Kill switch reaches flat within target time.']
      ]
    },
    {
      id: 'tg-market-data-integrity',
      name: 'Market Data Integrity Agent',
      lane: 'data',
      mission: 'Detect stale, gapped, or inconsistent market data before it drives a decision.',
      prompt:
        'You guard market data. Detect staleness, gaps, duplicate bars, and cross-source disagreement. Quarantine suspect data and mark downstream results as untrusted. Never interpolate missing market data into a decision path.',
      tools: ['local_files', 'http_fetch', 'sqlite', 'metrics_read'],
      skills: ['market-data-integrity'],
      riskTier: 'high',
      budget: HEAVY_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['staleness-watch', 'continuous', 'Watch feed timestamps for staleness.', 'Stale feeds disable dependent strategies.'],
        ['gap-detection', 'hourly', 'Detect missing bars and ticks per symbol.', 'Gaps recorded, never interpolated.'],
        ['cross-source-agreement', 'hourly', 'Compare sources for price disagreement.', 'Disagreements above threshold are quarantined.'],
        ['symbol-mapping-audit', 'weekly', 'Audit symbol mappings across providers.', 'Mappings resolve to the same instrument.'],
        ['historical-restatement', 'weekly', 'Detect provider restatements of historical data.', 'Restatements trigger dependent-result review.']
      ]
    },
    {
      id: 'tg-execution-simulator',
      name: 'Execution Simulator Agent',
      lane: 'research',
      mission: 'Simulate fills realistically before any strategy touches live routing.',
      prompt:
        'You simulate execution. Model queue position, partial fills, latency, and rejects. Compare simulated fills to any recorded live fills and report the gap. Flag any strategy whose edge disappears under realistic execution assumptions.',
      tools: ['local_files', 'shell', 'sqlite'],
      skills: ['backtest-review', 'risk-review'],
      riskTier: 'medium',
      budget: STANDARD_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['fill-model-calibration', 'weekly', 'Calibrate the fill model against recorded fills.', 'Simulated and live fill gap inside tolerance.'],
        ['latency-sensitivity', 'weekly', 'Test strategy sensitivity to added latency.', 'Latency-fragile strategies flagged.'],
        ['partial-fill-handling', 'weekly', 'Verify partial fill and reject handling paths.', 'No unhandled partial or reject state.'],
        ['slippage-attribution', 'weekly', 'Attribute slippage to spread, size, and timing.', 'Slippage decomposed by driver.'],
        ['paper-vs-sim-delta', 'weekly', 'Compare paper trading to simulation output.', 'Deltas explained or reconciled.']
      ]
    },
    {
      id: 'tg-swarm-coordinator',
      name: 'Swarm Coordinator Agent',
      lane: 'orchestration',
      mission: 'Coordinate local swarm workers with race-free trust signals.',
      prompt:
        'You coordinate the local swarm. Distribute tasks to workers, enforce race-free trust signal updates, and reconcile conflicting worker outputs by evidence rather than recency. Degrade to single-worker operation rather than accepting an unsafe merge.',
      tools: ['local_files', 'shell', 'sqlite'],
      skills: ['incident-runbook', 'risk-review'],
      riskTier: 'medium',
      budget: STANDARD_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['worker-health', 'continuous', 'Track worker liveness and restart stalled workers.', 'No worker stalls past the health timeout.'],
        ['trust-signal-race-audit', 'daily', 'Audit trust signal updates for race conditions.', 'Trust updates are atomic and ordered.'],
        ['plan-parse-hardening', 'weekly', 'Harden plan parsing against malformed output.', 'Malformed plans rejected without crashing.'],
        ['conflict-reconciliation', 'event', 'Reconcile conflicting worker conclusions by evidence.', 'Conflicts resolved with a recorded rationale.'],
        ['throughput-tuning', 'weekly', 'Tune concurrency against local resource limits.', 'Throughput improves without resource exhaustion.']
      ]
    },
    {
      id: 'tg-failover-drill',
      name: 'Edge Failover Drill Agent',
      lane: 'reliability',
      mission: 'Prove hybrid edge/cloud failover works before it is needed.',
      prompt:
        'You drill failover. Cut cloud connectivity, verify edge-local operation, then verify clean resynchronization on recovery. Record the exact data reconciliation behavior. Never leave a drill artifact in a live path.',
      tools: ['local_files', 'shell', 'http_fetch', 'metrics_read'],
      skills: ['resiliency-drill', 'incident-runbook'],
      riskTier: 'medium',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['edge-isolation-drill', 'weekly', 'Run the edge isolation drill and record behavior.', 'Edge continues operating with local state.'],
        ['resync-integrity', 'weekly', 'Verify state resynchronization after reconnect.', 'No duplicate or lost state on resync.'],
        ['degraded-mode-limits', 'weekly', 'Confirm risk limits still apply in degraded mode.', 'Limits enforced identically offline.'],
        ['drill-artifact-cleanup', 'event', 'Clean up drill artifacts from all environments.', 'No drill artifact remains after a run.'],
        ['recovery-time-tracking', 'weekly', 'Track recovery time against the target.', 'Recovery time within the stated objective.']
      ]
    },
    {
      id: 'tg-compliance-log',
      name: 'Compliance Log Agent',
      lane: 'compliance',
      mission: 'Keep an append-only, verifiable record of every decision and override.',
      prompt:
        'You maintain the compliance log. Every decision, limit check, override, and drill must produce an append-only record with actor, inputs, and outcome. Detect and report any gap or mutation in the log. You never delete or rewrite a log entry.',
      tools: ['local_files', 'sqlite'],
      skills: ['risk-review', 'knowledge-capture'],
      riskTier: 'high',
      budget: LIGHT_BUDGET,
      guardrails: {
        forbiddenActions: ['log_delete', 'log_rewrite', 'paid_api_call', 'production_deploy', 'move_money'],
        approvalRequiredActions: ['external_share', 'repo_write']
      },
      threads: [
        ['append-only-verification', 'daily', 'Verify the log chain has no mutations or gaps.', 'Log chain verifies end to end.'],
        ['override-review', 'daily', 'Review every override for authorization.', 'All overrides carry an authorized actor.'],
        ['retention-policy', 'weekly', 'Apply retention policy without breaking the chain.', 'Retention applied with chain integrity intact.'],
        ['evidence-export', 'on_demand', 'Export a verifiable evidence packet on request.', 'Export verifies against the live chain.'],
        ['decision-coverage', 'daily', 'Confirm every risk decision produced a log entry.', 'No decision executes without a log record.']
      ]
    }
  ],
  content: [
    {
      id: 'content-research',
      name: 'Editorial Research Agent',
      lane: 'editorial',
      mission: 'Build sourced research briefs before anything is drafted.',
      prompt:
        'You research before anyone writes. Produce briefs with the buyer question, current answers in market, primary sources with links, and the gap the piece will fill. Every claim in the brief carries a source. Mark anything you could not verify as unverified.',
      tools: ['local_files', 'public_web_search', 'playwright_local'],
      skills: ['editorial-research', 'fact-check'],
      riskTier: 'low',
      budget: STANDARD_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['brief-production', 'weekly', 'Produce sourced briefs for the editorial queue.', 'Every queued piece has a sourced brief.'],
        ['source-freshness', 'weekly', 'Refresh sources older than the freshness window.', 'No brief cites a stale primary source.'],
        ['competitor-gap-scan', 'weekly', 'Scan competing coverage for unanswered questions.', 'Gaps captured as brief candidates.'],
        ['question-mining', 'weekly', 'Mine buyer questions from intake and support threads.', 'Question backlog fed from real conversations.'],
        ['citation-hygiene', 'weekly', 'Check citations resolve and support the claim.', 'All citations resolve and match the claim.'],
        ['topic-prioritization', 'weekly', 'Prioritize topics by revenue proximity.', 'Queue ordered by expected revenue impact.']
      ]
    },
    {
      id: 'content-draft',
      name: 'Draft Agent',
      lane: 'editorial',
      mission: 'Turn briefs into complete, specific drafts with no filler.',
      prompt:
        'You draft from an approved brief only. Write specific, operator-grade prose: concrete steps, real numbers, named tools. No filler, no unverifiable claims, no invented case studies. Leave a marked TODO where a fact is missing rather than inventing it.',
      tools: ['local_files', 'github_read'],
      skills: ['brand-voice', 'editorial-research'],
      riskTier: 'low',
      budget: STANDARD_BUDGET,
      guardrails: OUTBOUND_GUARDRAILS,
      threads: [
        ['first-draft', 'weekly', 'Draft queued briefs into full pieces.', 'Each approved brief becomes a complete draft.'],
        ['structure-pass', 'weekly', 'Restructure drafts for scanability and flow.', 'Drafts follow the standard section structure.'],
        ['example-enrichment', 'weekly', 'Add concrete, verifiable examples to thin sections.', 'No section left abstract.'],
        ['todo-resolution', 'weekly', 'Resolve or escalate open fact TODOs in drafts.', 'No draft ships with an unresolved TODO.'],
        ['length-discipline', 'weekly', 'Cut drafts to the shortest complete version.', 'Word count justified by covered ground.']
      ]
    },
    {
      id: 'content-fact-check',
      name: 'Fact Check Agent',
      lane: 'compliance',
      mission: 'Verify every factual and capability claim before publication.',
      prompt:
        'You fact-check drafts. Every number, date, product behavior, and capability claim must trace to a source or be removed. Apply the content guard to certification and procurement status language. A draft with an unverifiable claim does not pass, regardless of deadline.',
      tools: ['local_files', 'public_web_search', 'shell'],
      skills: ['fact-check', 'content-guard'],
      riskTier: 'high',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['claim-verification', 'weekly', 'Verify each claim against a primary source.', 'All claims sourced or removed.'],
        ['guard-compliance', 'weekly', 'Run the content guard over the publication queue.', 'Guard passes on every queued piece.'],
        ['number-audit', 'weekly', 'Audit statistics, dates, and pricing figures.', 'Every number traced to its source.'],
        ['correction-log', 'event', 'Log and publish corrections for shipped errors.', 'Corrections logged within one cycle.'],
        ['source-quality-review', 'weekly', 'Downgrade weak or circular sources.', 'No claim rests on a circular source.']
      ]
    },
    {
      id: 'content-repurpose',
      name: 'Repurposing Agent',
      lane: 'growth',
      mission: 'Convert each published piece into channel-native derivatives.',
      prompt:
        'You repurpose published work. Produce channel-native derivatives that stand alone: short posts, checklists, email sections, and slide outlines. Keep the claims identical to the verified source piece. Stage everything for approval; never publish.',
      tools: ['local_files'],
      skills: ['distribution', 'brand-voice'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: OUTBOUND_GUARDRAILS,
      threads: [
        ['derivative-generation', 'weekly', 'Generate derivatives for each published piece.', 'Every publication has staged derivatives.'],
        ['checklist-extraction', 'weekly', 'Extract operator checklists from long pieces.', 'Checklists usable standalone in the field.'],
        ['email-section-build', 'weekly', 'Build newsletter sections from recent work.', 'Newsletter drafted from published material only.'],
        ['claim-parity-check', 'weekly', 'Verify derivatives keep source claims intact.', 'No derivative introduces a new claim.'],
        ['evergreen-refresh', 'weekly', 'Refresh evergreen derivatives with current facts.', 'Evergreen assets carry current facts.']
      ]
    },
    {
      id: 'content-distribution',
      name: 'Distribution Agent',
      lane: 'growth',
      mission: 'Schedule and track distribution without unapproved posting.',
      prompt:
        'You plan distribution. Build the schedule per channel, stage posts for approval, and track performance against the objective for each piece. You never post publicly or send mail. Report which channels actually produce qualified inbound.',
      tools: ['local_files', 'metrics_read'],
      skills: ['distribution'],
      riskTier: 'medium',
      budget: LIGHT_BUDGET,
      guardrails: OUTBOUND_GUARDRAILS,
      threads: [
        ['schedule-build', 'weekly', 'Build the per-channel distribution schedule.', 'Every published piece has a schedule.'],
        ['approval-staging', 'weekly', 'Stage each scheduled post for owner approval.', 'Nothing posts without an approval record.'],
        ['channel-performance', 'weekly', 'Attribute inbound to channel and piece.', 'Channel performance reported with attribution.'],
        ['syndication-check', 'weekly', 'Verify syndicated copies point back canonically.', 'All syndicated copies carry canonical links.'],
        ['dead-channel-pruning', 'weekly', 'Prune channels with no measurable return.', 'Effort concentrated on productive channels.']
      ]
    },
    {
      id: 'content-brand-voice',
      name: 'Brand Voice Agent',
      lane: 'editorial',
      mission: 'Hold one consistent operator voice across every surface.',
      prompt:
        'You enforce brand voice: direct, technical, no hype, no hedging, no filler adjectives. Flag drift with the offending sentence and a rewritten version. Voice never overrides accuracy — if a rewrite weakens a fact, keep the fact.',
      tools: ['local_files'],
      skills: ['brand-voice', 'content-guard'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['voice-drift-scan', 'weekly', 'Scan drafts and site copy for voice drift.', 'Drift flagged with concrete rewrites.'],
        ['terminology-consistency', 'weekly', 'Keep product and service terms consistent.', 'One term per concept across surfaces.'],
        ['hype-removal', 'weekly', 'Remove unsupported superlatives and hype.', 'No unsupported superlative ships.'],
        ['style-guide-upkeep', 'weekly', 'Keep the style guide current with decisions made.', 'Style guide reflects current rulings.'],
        ['readability-pass', 'weekly', 'Tighten sentences for operator readability.', 'Sentences carry one idea each.']
      ]
    },
    {
      id: 'content-archive-index',
      name: 'Archive and Index Agent',
      lane: 'knowledge',
      mission: 'Keep the content archive searchable, deduplicated, and cross-linked.',
      prompt:
        'You maintain the content archive. Index every published piece with topic, buyer stage, and linked services. Detect near-duplicate coverage and recommend consolidation. Keep internal cross-links pointing to the strongest current piece.',
      tools: ['local_files', 'sqlite'],
      skills: ['knowledge-capture', 'seo-audit'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['archive-indexing', 'weekly', 'Index new publications with full metadata.', 'Archive index complete and current.'],
        ['duplicate-consolidation', 'weekly', 'Find near-duplicate pieces and recommend merges.', 'Overlapping pieces consolidated or differentiated.'],
        ['cross-link-refresh', 'weekly', 'Point internal links to the strongest current piece.', 'Cross-links resolve to canonical coverage.'],
        ['retirement-review', 'weekly', 'Retire or update content that no longer reflects operations.', 'No published piece contradicts current practice.'],
        ['topic-coverage-map', 'weekly', 'Map archive coverage against the service catalog.', 'Every service line has current supporting content.']
      ]
    }
  ],
  'daily-command-os': [
    {
      id: 'dc-morning-brief',
      name: 'Morning Brief Agent',
      lane: 'command',
      mission: 'Deliver one decision-ready brief at the start of each operating day.',
      prompt:
        'You write the morning brief. Lead with what needs a decision today, then money in motion, then risks. Every line carries a number or a name. No status narration, no restating yesterday. If a data source failed, say so instead of omitting the section.',
      tools: ['local_files', 'sqlite', 'metrics_read', 'http_fetch'],
      skills: ['knowledge-capture', 'incident-runbook'],
      riskTier: 'medium',
      budget: LIGHT_BUDGET,
      guardrails: OUTBOUND_GUARDRAILS,
      threads: [
        ['brief-assembly', 'daily', 'Assemble the morning brief from live sources.', 'Brief delivered before the operating day starts.'],
        ['decision-queue', 'daily', 'Surface decisions blocking downstream work.', 'Every blocking decision listed with an owner.'],
        ['source-failure-disclosure', 'daily', 'Disclose any data source that failed to load.', 'No section silently omitted.'],
        ['brief-feedback-loop', 'weekly', 'Tune brief content from what actually got acted on.', 'Unused sections dropped from the template.'],
        ['secret-preflight', 'daily', 'Validate required secrets before the brief job runs.', 'Job fails fast with a named missing secret.'],
        ['delivery-confirmation', 'daily', 'Confirm delivery reached the operating channel.', 'Delivery confirmed or retried with an alert.']
      ]
    },
    {
      id: 'dc-task-triage',
      name: 'Task Triage Agent',
      lane: 'command',
      mission: 'Keep the work queue ordered by revenue proximity and deadline risk.',
      prompt:
        'You triage the queue. Rank by revenue proximity, deadline risk, and unblock value. Merge duplicates, close stale items with a reason, and never let a P0 sit without an owner. Explain any reordering in one line.',
      tools: ['local_files', 'sqlite'],
      skills: ['knowledge-capture'],
      riskTier: 'low',
      budget: STANDARD_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['priority-ranking', 'daily', 'Rank the open queue by revenue proximity and risk.', 'Queue ordered with stated reasons.'],
        ['owner-assignment', 'daily', 'Ensure every P0 and P1 item has an owner.', 'No priority item unowned.'],
        ['stale-item-closure', 'weekly', 'Close stale items with a recorded reason.', 'Queue free of items untouched past the window.'],
        ['duplicate-merge', 'daily', 'Merge duplicate task entries.', 'One task per unit of work.'],
        ['deadline-risk-alert', 'daily', 'Alert on items at risk of missing a deadline.', 'At-risk items escalated before the deadline.']
      ]
    },
    {
      id: 'dc-approval-gate',
      name: 'Approval Gate Agent',
      lane: 'governance',
      mission: 'Hold every outbound and irreversible action behind an explicit approval.',
      prompt:
        'You are the approval gate. Any outbound message, publication, payment, deploy, or irreversible change requires an explicit owner approval record before execution. Present each request with the exact action, blast radius, and reversal path. You never approve on the owner behalf.',
      tools: ['local_files', 'sqlite'],
      skills: ['approval-gate', 'cost-guard'],
      riskTier: 'high',
      budget: STANDARD_BUDGET,
      guardrails: {
        forbiddenActions: ['self_approve', 'paid_api_call', 'production_deploy', 'move_money', 'email_send'],
        approvalRequiredActions: ['policy_update', 'gate_bypass']
      },
      threads: [
        ['request-intake', 'continuous', 'Intake and normalize approval requests.', 'Every gated action has a request record.'],
        ['blast-radius-annotation', 'continuous', 'Annotate each request with impact and reversal path.', 'No request presented without impact detail.'],
        ['expiry-enforcement', 'daily', 'Expire stale approval requests.', 'No approval executes on a stale grant.'],
        ['bypass-detection', 'daily', 'Detect actions that skipped the gate.', 'Bypasses reported with the responsible path.'],
        ['audit-trail-export', 'weekly', 'Export the approval audit trail.', 'Audit trail complete and exportable.']
      ]
    },
    {
      id: 'dc-metrics-rollup',
      name: 'Metrics Rollup Agent',
      lane: 'reporting',
      mission: 'Roll every repo and lane into one comparable metric set.',
      prompt:
        'You roll up metrics across repos and lanes. Use identical definitions everywhere and state the definition next to each number. Never blend estimated and measured values without labeling. If a repo reports nothing, show it as missing rather than zero.',
      tools: ['local_files', 'sqlite', 'metrics_read', 'github_read'],
      skills: ['pipeline-forecast', 'knowledge-capture'],
      riskTier: 'low',
      budget: STANDARD_BUDGET,
      guardrails: READ_ONLY_GUARDRAILS,
      threads: [
        ['cross-repo-rollup', 'daily', 'Roll up metrics from every repo lane.', 'One comparable metric set published daily.'],
        ['definition-registry', 'weekly', 'Maintain the metric definition registry.', 'Every metric has one written definition.'],
        ['missing-data-marking', 'daily', 'Mark missing inputs as missing, not zero.', 'No zero substituted for absent data.'],
        ['trend-annotation', 'weekly', 'Annotate trends with the driving change.', 'Each trend line carries a cause.'],
        ['dashboard-freshness', 'hourly', 'Verify dashboard data freshness timestamps.', 'Dashboard shows accurate freshness state.']
      ]
    },
    {
      id: 'dc-incident-response',
      name: 'Incident Response Agent',
      lane: 'reliability',
      mission: 'Drive incidents from detection to root cause with a written trail.',
      prompt:
        'You run incidents. Establish impact, stabilize, then root-cause with evidence separated from theory. Write the timeline as you go. Never close an incident without a root cause or an explicit accepted-unknown, plus a prevention action.',
      tools: ['local_files', 'shell', 'http_fetch', 'metrics_read', 'github_read'],
      skills: ['incident-runbook', 'resiliency-drill'],
      riskTier: 'high',
      budget: HEAVY_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['detection-triage', 'continuous', 'Triage alerts into incidents or noise.', 'Real incidents opened within one cycle.'],
        ['timeline-capture', 'event', 'Capture the incident timeline as events happen.', 'Timeline complete at incident close.'],
        ['root-cause-analysis', 'event', 'Establish root cause with evidence.', 'Cause supported by evidence, theory labeled.'],
        ['prevention-action', 'event', 'Create a prevention action per incident.', 'Every incident yields a tracked prevention item.'],
        ['alert-noise-reduction', 'weekly', 'Tune alerts that fire without action.', 'Actionable alert ratio improves.']
      ]
    },
    {
      id: 'dc-cost-guard',
      name: 'Zero Spend Cost Guard Agent',
      lane: 'governance',
      mission: 'Block spend and paid adapters across the entire fleet.',
      prompt:
        'You enforce strict zero spend. Block any paid API call, paid compute, or paid storage creation across all repos and agents. Audit fleet budgets for any nonzero cost cap. Report attempted spend with the calling path. You cannot authorize spend under any condition.',
      tools: ['local_files', 'shell', 'github_read', 'metrics_read'],
      skills: ['cost-guard', 'secret-hygiene'],
      riskTier: 'high',
      budget: LIGHT_BUDGET,
      guardrails: {
        forbiddenActions: ['paid_api_call', 'paid_compute_create', 'paid_storage_create', 'move_money', 'budget_raise'],
        approvalRequiredActions: ['any_cost', 'policy_update']
      },
      threads: [
        ['budget-invariant-audit', 'daily', 'Audit every fleet budget for a zero cost cap.', 'No agent carries a nonzero cost cap.'],
        ['paid-adapter-scan', 'daily', 'Scan for enabled paid adapters in any repo.', 'Paid adapters remain disabled everywhere.'],
        ['run-quota-enforcement', 'continuous', 'Enforce per-agent run and duration quotas.', 'No agent exceeds its daily run quota.'],
        ['spend-attempt-report', 'event', 'Report attempted spend with the calling path.', 'Every attempt reported and blocked.'],
        ['free-tier-headroom', 'weekly', 'Track free-tier usage headroom per provider.', 'No provider crosses its free-tier ceiling.']
      ]
    },
    {
      id: 'dc-knowledge-capture',
      name: 'Knowledge Capture Agent',
      lane: 'knowledge',
      mission: 'Turn every resolved problem into reusable, findable knowledge.',
      prompt:
        'You capture knowledge. After each incident, decision, or repeated fix, write a short durable note: context, decision, and the signal that should trigger it again. Delete superseded notes rather than stacking contradictions. Keep notes findable by lane and repo.',
      tools: ['local_files', 'sqlite', 'github_read'],
      skills: ['knowledge-capture'],
      riskTier: 'low',
      budget: LIGHT_BUDGET,
      guardrails: WRITE_GUARDRAILS,
      threads: [
        ['decision-record', 'event', 'Write a decision record for each material decision.', 'Decisions traceable with context and rationale.'],
        ['runbook-extraction', 'weekly', 'Extract runbooks from repeated manual fixes.', 'Repeated fixes have a runbook.'],
        ['contradiction-sweep', 'weekly', 'Remove superseded or contradicting notes.', 'Knowledge base free of contradictions.'],
        ['skill-promotion', 'weekly', 'Promote proven procedures into agent skills.', 'Proven procedures available as skills.'],
        ['fleet-prompt-review', 'weekly', 'Review agent prompts against observed failure modes.', 'Prompts updated wherever a failure mode repeats.']
      ]
    }
  ]
};

function buildThread(agentId: string, repo: FleetRepo, spec: ThreadSpec): FleetThread {
  const [slug, cadence, objective, successSignal] = spec;
  return { id: `${agentId}::${slug}`, agentId, repo, slug, cadence, objective, successSignal };
}

function buildAgent(repo: FleetRepo, spec: AgentSpec): FleetAgent {
  return {
    id: spec.id,
    name: spec.name,
    repo,
    lane: spec.lane,
    mission: spec.mission,
    prompt: spec.prompt,
    tools: spec.tools,
    skills: spec.skills,
    budget: { maxCostUsd: 0, ...spec.budget },
    guardrails: spec.guardrails,
    riskTier: spec.riskTier,
    verifierRequired: spec.riskTier !== 'low',
    threads: spec.threads.map((thread) => buildThread(spec.id, repo, thread))
  };
}

const FLEET: FleetAgent[] = FLEET_REPOS.flatMap((repo) =>
  FLEET_SPECS[repo].map((spec) => buildAgent(repo, spec))
);

export const EXPECTED_AGENT_COUNT = 42;
export const EXPECTED_THREAD_COUNT = 216;

export function getAgentFleet(repo?: FleetRepo): FleetAgent[] {
  return repo ? FLEET.filter((agent) => agent.repo === repo) : FLEET;
}

export function getAgent(agentId: string): FleetAgent | undefined {
  return FLEET.find((agent) => agent.id === agentId);
}

export function getFleetThreads(repo?: FleetRepo): FleetThread[] {
  return getAgentFleet(repo).flatMap((agent) => agent.threads);
}

export interface RepoFleetSummary {
  repo: FleetRepo;
  agentCount: number;
  threadCount: number;
  lanes: string[];
  maxCostUsd: number;
  maxRunsPerDay: number;
  highRiskAgents: number;
}

export interface FleetSummary {
  agentCount: number;
  threadCount: number;
  repoCount: number;
  maxCostUsd: number;
  maxRunsPerDay: number;
  cadenceCounts: Record<ThreadCadence, number>;
  toolGrants: Record<string, number>;
  skillCoverage: Record<string, number>;
  repos: RepoFleetSummary[];
}

export function getFleetSummary(): FleetSummary {
  const cadenceCounts = THREAD_CADENCES.reduce(
    (acc, cadence) => ({ ...acc, [cadence]: 0 }),
    {} as Record<ThreadCadence, number>
  );
  const toolGrants: Record<string, number> = {};
  const skillCoverage: Record<string, number> = {};

  for (const agent of FLEET) {
    for (const tool of agent.tools) toolGrants[tool] = (toolGrants[tool] ?? 0) + 1;
    for (const skill of agent.skills) skillCoverage[skill] = (skillCoverage[skill] ?? 0) + 1;
    for (const thread of agent.threads) cadenceCounts[thread.cadence] += 1;
  }

  const repos = FLEET_REPOS.map((repo): RepoFleetSummary => {
    const agents = getAgentFleet(repo);
    return {
      repo,
      agentCount: agents.length,
      threadCount: agents.reduce((total, agent) => total + agent.threads.length, 0),
      lanes: [...new Set(agents.map((agent) => agent.lane))].sort(),
      maxCostUsd: agents.reduce((total, agent) => total + agent.budget.maxCostUsd, 0),
      maxRunsPerDay: agents.reduce((total, agent) => total + agent.budget.maxRunsPerDay, 0),
      highRiskAgents: agents.filter((agent) => agent.riskTier === 'high').length
    };
  });

  return {
    agentCount: FLEET.length,
    threadCount: getFleetThreads().length,
    repoCount: FLEET_REPOS.length,
    maxCostUsd: FLEET.reduce((total, agent) => total + agent.budget.maxCostUsd, 0),
    maxRunsPerDay: FLEET.reduce((total, agent) => total + agent.budget.maxRunsPerDay, 0),
    cadenceCounts,
    toolGrants,
    skillCoverage,
    repos
  };
}

export interface FleetCheck {
  id: string;
  description: string;
  ok: boolean;
  detail: string;
}

export interface FleetVerification {
  ok: boolean;
  checkedAt: string;
  passed: number;
  failed: number;
  checks: FleetCheck[];
  failures: string[];
}

const MIN_PROMPT_LENGTH = 120;

function check(id: string, description: string, ok: boolean, detail: string): FleetCheck {
  return { id, description, ok, detail };
}

/** Deterministic functional verification of the deployed fleet. */
export function verifyAgentFleet(): FleetVerification {
  const threads = getFleetThreads();
  const agentIds = FLEET.map((agent) => agent.id);
  const threadIds = threads.map((thread) => thread.id);

  const shortPrompts = FLEET.filter((agent) => agent.prompt.trim().length < MIN_PROMPT_LENGTH).map((a) => a.id);
  const noTools = FLEET.filter((agent) => agent.tools.length === 0).map((a) => a.id);
  const noSkills = FLEET.filter((agent) => agent.skills.length === 0).map((a) => a.id);
  const duplicateTools = FLEET.filter((agent) => new Set(agent.tools).size !== agent.tools.length).map((a) => a.id);
  const duplicateSkills = FLEET.filter((agent) => new Set(agent.skills).size !== agent.skills.length).map((a) => a.id);
  const badBudgets = FLEET.filter(
    (agent) =>
      agent.budget.maxCostUsd !== 0 ||
      agent.budget.maxRunsPerDay <= 0 ||
      agent.budget.maxMinutesPerRun <= 0 ||
      agent.budget.maxTokensPerRun <= 0
  ).map((a) => a.id);
  const weakGuardrails = FLEET.filter(
    (agent) =>
      agent.guardrails.forbiddenActions.length === 0 ||
      agent.guardrails.approvalRequiredActions.length === 0 ||
      !agent.guardrails.forbiddenActions.includes('paid_api_call')
  ).map((a) => a.id);
  const missingVerifier = FLEET.filter((agent) => agent.riskTier !== 'low' && !agent.verifierRequired).map((a) => a.id);
  const threadlessAgents = FLEET.filter((agent) => agent.threads.length === 0).map((a) => a.id);
  const badCadence = threads.filter((thread) => !THREAD_CADENCES.includes(thread.cadence)).map((t) => t.id);
  const badThreadOwnership = threads.filter((thread) => !thread.id.startsWith(`${thread.agentId}::`)).map((t) => t.id);
  const emptyObjectives = threads
    .filter((thread) => !thread.objective.trim() || !thread.successSignal.trim())
    .map((t) => t.id);
  const uncoveredRepos = FLEET_REPOS.filter((repo) => getAgentFleet(repo).length === 0);

  const checks: FleetCheck[] = [
    check('agent-count', `Fleet deploys exactly ${EXPECTED_AGENT_COUNT} agents`, FLEET.length === EXPECTED_AGENT_COUNT, `${FLEET.length} agents`),
    check('thread-count', `Fleet runs exactly ${EXPECTED_THREAD_COUNT} threads`, threads.length === EXPECTED_THREAD_COUNT, `${threads.length} threads`),
    check('agent-id-unique', 'Agent ids are unique', new Set(agentIds).size === agentIds.length, `${new Set(agentIds).size} unique ids`),
    check('thread-id-unique', 'Thread ids are unique', new Set(threadIds).size === threadIds.length, `${new Set(threadIds).size} unique ids`),
    check('repo-coverage', 'Every target repo has agents deployed', uncoveredRepos.length === 0, uncoveredRepos.join(', ') || 'all repos covered'),
    check('prompt-quality', `Every agent has a prompt of at least ${MIN_PROMPT_LENGTH} characters`, shortPrompts.length === 0, shortPrompts.join(', ') || 'all prompts sized'),
    check('tool-grant', 'Every agent has at least one tool granted', noTools.length === 0, noTools.join(', ') || 'all agents tooled'),
    check('tool-grant-unique', 'Tool grants contain no duplicates', duplicateTools.length === 0, duplicateTools.join(', ') || 'no duplicate grants'),
    check('skill-assignment', 'Every agent has at least one skill', noSkills.length === 0, noSkills.join(', ') || 'all agents skilled'),
    check('skill-unique', 'Skill assignments contain no duplicates', duplicateSkills.length === 0, duplicateSkills.join(', ') || 'no duplicate skills'),
    check('budget-zero-spend', 'Every budget is capped at $0 with positive run limits', badBudgets.length === 0, badBudgets.join(', ') || 'all budgets compliant'),
    check('guardrails', 'Every agent forbids paid calls and names approval actions', weakGuardrails.length === 0, weakGuardrails.join(', ') || 'all guardrails set'),
    check('verifier-required', 'Medium and high risk agents require a verifier', missingVerifier.length === 0, missingVerifier.join(', ') || 'verifiers required'),
    check('threads-per-agent', 'Every agent owns at least one thread', threadlessAgents.length === 0, threadlessAgents.join(', ') || 'all agents threaded'),
    check('thread-cadence', 'Every thread has a valid cadence', badCadence.length === 0, badCadence.join(', ') || 'all cadences valid'),
    check('thread-ownership', 'Every thread id is namespaced by its agent', badThreadOwnership.length === 0, badThreadOwnership.join(', ') || 'ownership intact'),
    check('thread-objectives', 'Every thread states an objective and success signal', emptyObjectives.length === 0, emptyObjectives.join(', ') || 'all objectives stated')
  ];

  const failures = checks.filter((item) => !item.ok);

  return {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    passed: checks.length - failures.length,
    failed: failures.length,
    checks,
    failures: failures.map((item) => `${item.id}: ${item.detail}`)
  };
}

export function isFleetRepo(value: unknown): value is FleetRepo {
  return typeof value === 'string' && (FLEET_REPOS as string[]).includes(value);
}
