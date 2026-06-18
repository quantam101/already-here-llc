export type RevenuePriority = 'P0' | 'P1' | 'P2';
export type RevenueStatus = 'ready_for_build' | 'in_progress' | 'blocked' | 'live_ready' | 'needs_verification';
export type SecurityRisk = 'low' | 'medium' | 'high';
export type ReviewAction = 'review' | 'pass' | 'reply' | 'assign' | 'quote' | 'schedule' | 'prove';

export interface RevenueCommandRecord {
  id: string;
  lane: string;
  systemModule: string;
  repoOrPlatform: string;
  affectedDataTable: string;
  revenueLaneSupported: string;
  priority: RevenuePriority;
  blocker: string;
  nextAction: string;
  expectedRevenueOrOperationalValue: string;
  securityRisk: SecurityRisk;
  testVerificationMethod: string;
  status: RevenueStatus;
  recommendedFollowUpDate: string;
  dailyRevenueImpact: number;
  recurringRevenuePotential: number;
  dataNetworkValue: number;
  buildDependency: number;
  systemRiskReduction: number;
  speedToProofOfWork: number;
  reusableProductPotential: number;
}

export interface ExecutiveBuildAction {
  rank: number;
  title: string;
  objective: string;
  ownerValue: string;
  proofMethod: string;
  targetOutcome: string;
  priority: RevenuePriority;
}

export interface RevenueCommandSpineResponse {
  ok: true;
  service: 'already-here-revenue-command-spine';
  generatedAt: string;
  repo: 'quantam101/already-here-llc';
  databaseRole: 'owned_core_asset_layer';
  externalActions: 'blocked_by_default';
  executiveBuildPlan: ExecutiveBuildAction[];
  records: RevenueCommandRecord[];
  databaseTables: string[];
  approvalActions: ReviewAction[];
  proofOfWorkDemos: string[];
}

export interface ReviewActionResult {
  ok: true;
  action: ReviewAction;
  recordId: string;
  record?: RevenueCommandRecord;
  persistedExternally: false;
  approvalRequired: boolean;
  message: string;
  nextLocalState: 'reviewed' | 'passed' | 'reply_drafted' | 'assigned' | 'quoted' | 'scheduled' | 'proof_recorded';
}

const BASE_FOLLOW_UP = '2026-06-19';

export const DATABASE_TABLES = [
  'organizations',
  'contacts',
  'leads',
  'opportunities',
  'jobs',
  'dispatches',
  'technicians',
  'vendors',
  'vehicles',
  'repair_orders',
  'hauling_jobs',
  'routes',
  'procurement_targets',
  'products',
  'affiliate_links',
  'reviews',
  'conversations',
  'ai_actions',
  'analytics_events',
  'audit_logs',
  'proof_of_work',
  'codex_changelog',
  'catch_correct_events',
  'system_health_signals'
];

export const APPROVAL_ACTIONS: ReviewAction[] = ['review', 'pass', 'reply', 'assign', 'quote', 'schedule', 'prove'];

const RAW_RECORDS: RevenueCommandRecord[] = [
  {
    id: 'rcs-001-owned-db-core',
    lane: 'Core Asset',
    systemModule: 'Unified Revenue Database Core',
    repoOrPlatform: 'quantam101/already-here-llc',
    affectedDataTable: 'organizations, contacts, leads, opportunities, ai_actions, proof_of_work',
    revenueLaneSupported: 'All revenue lanes',
    priority: 'P0',
    blocker: 'No single canonical owned data spine for every lead, job, contact, vendor, and proof artifact.',
    nextAction: 'Make the Revenue Command Spine the canonical data contract for all modules before adding more disconnected pages.',
    expectedRevenueOrOperationalValue: 'Creates the owned database layer that compounds across dispatch, AutoWorks, hauling, procurement, AI receptionist, product, and affiliate lanes.',
    securityRisk: 'medium',
    testVerificationMethod: 'Function-level record shape test, API smoke test, schema table count validation, and no external action check.',
    status: 'in_progress',
    recommendedFollowUpDate: BASE_FOLLOW_UP,
    dailyRevenueImpact: 9,
    recurringRevenuePotential: 10,
    dataNetworkValue: 10,
    buildDependency: 10,
    systemRiskReduction: 8,
    speedToProofOfWork: 8,
    reusableProductPotential: 10
  },
  {
    id: 'rcs-002-ai-receptionist',
    lane: 'Revenue Intake',
    systemModule: 'AI Receptionist and Lead Capture',
    repoOrPlatform: 'alreadyherellc.com / Next.js API',
    affectedDataTable: 'leads, contacts, conversations, opportunities, reviews',
    revenueLaneSupported: 'IT field services, AI automation, AutoWorks, hauling',
    priority: 'P0',
    blocker: 'Live forms and AI chat intake need one owned write path and review gate.',
    nextAction: 'Route every intake source into leads, contacts, conversations, and opportunities with Review, Pass, Reply, Assign, Quote, Schedule, and Prove actions.',
    expectedRevenueOrOperationalValue: 'Captures inbound work and turns raw messages into structured revenue records and reusable AI automation proof.',
    securityRisk: 'medium',
    testVerificationMethod: 'POST review-action API test, lead shape validation, audit event check, and no-send reply draft verification.',
    status: 'ready_for_build',
    recommendedFollowUpDate: BASE_FOLLOW_UP,
    dailyRevenueImpact: 10,
    recurringRevenuePotential: 9,
    dataNetworkValue: 10,
    buildDependency: 9,
    systemRiskReduction: 7,
    speedToProofOfWork: 9,
    reusableProductPotential: 10
  },
  {
    id: 'rcs-003-opportunity-scoring',
    lane: 'Revenue Intelligence',
    systemModule: 'Lead and Opportunity Database',
    repoOrPlatform: 'quantam101/already-here-llc',
    affectedDataTable: 'opportunities, leads, reviews, analytics_events',
    revenueLaneSupported: '$500 daily revenue target',
    priority: 'P0',
    blocker: 'Opportunities are not yet uniformly ranked by same-day value, route fit, recurrence, risk, and proof potential.',
    nextAction: 'Use the spine scoring model to rank P0/P1/P2 work and suppress low-value actions from the command queue.',
    expectedRevenueOrOperationalValue: 'Pushes $500/day opportunities above passive or low-margin work and creates a training set for the AI agent.',
    securityRisk: 'low',
    testVerificationMethod: 'Score ordering test: urgent $500 same-day work must outrank non-urgent internal backlog.',
    status: 'in_progress',
    recommendedFollowUpDate: BASE_FOLLOW_UP,
    dailyRevenueImpact: 10,
    recurringRevenuePotential: 8,
    dataNetworkValue: 9,
    buildDependency: 9,
    systemRiskReduction: 6,
    speedToProofOfWork: 10,
    reusableProductPotential: 8
  },
  {
    id: 'rcs-004-dashboard',
    lane: 'Operations',
    systemModule: 'Opportunity Command Dashboard',
    repoOrPlatform: 'Vercel / already-here-llc',
    affectedDataTable: 'opportunities, jobs, dispatches, ai_actions, system_health_signals',
    revenueLaneSupported: 'All active work lanes',
    priority: 'P0',
    blocker: 'Daily Command exists, but the revenue database dashboard needs a dedicated view for owned records.',
    nextAction: 'Expose a mobile-ready Revenue Command page that renders ranked records, database tables, and review-action buttons.',
    expectedRevenueOrOperationalValue: 'Consolidates decision-making so Stephen can act on the highest-value records first from phone or laptop.',
    securityRisk: 'low',
    testVerificationMethod: 'Live page smoke test and API route smoke test.',
    status: 'in_progress',
    recommendedFollowUpDate: BASE_FOLLOW_UP,
    dailyRevenueImpact: 9,
    recurringRevenuePotential: 8,
    dataNetworkValue: 9,
    buildDependency: 8,
    systemRiskReduction: 7,
    speedToProofOfWork: 10,
    reusableProductPotential: 9
  },
  {
    id: 'rcs-005-dispatch-network',
    lane: 'Dispatch',
    systemModule: 'Dispatch Module',
    repoOrPlatform: 'alreadyherellc.com / dispatch',
    affectedDataTable: 'dispatches, technicians, vendors, jobs, proof_of_work',
    revenueLaneSupported: 'IT field services and vendor overflow work',
    priority: 'P1',
    blocker: 'Technician skill records and vendor/client job history are not centralized yet.',
    nextAction: 'Create technician/vendor/job relationships and route every field-service opportunity through dispatch scoring.',
    expectedRevenueOrOperationalValue: 'Supports subcontracting, overflow capture, route-fit matching, and repeat dispatch work.',
    securityRisk: 'medium',
    testVerificationMethod: 'Dispatch match test using skill, location, urgency, and minimum revenue filters.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-20',
    dailyRevenueImpact: 10,
    recurringRevenuePotential: 9,
    dataNetworkValue: 9,
    buildDependency: 7,
    systemRiskReduction: 7,
    speedToProofOfWork: 8,
    reusableProductPotential: 9
  },
  {
    id: 'rcs-006-autoworks',
    lane: 'AutoWorks',
    systemModule: 'AutoWorks Module',
    repoOrPlatform: 'Already Here AutoWorks internal module',
    affectedDataTable: 'vehicles, repair_orders, contacts, opportunities, proof_of_work',
    revenueLaneSupported: 'Gas/light-duty repair intake only',
    priority: 'P1',
    blocker: 'Vehicle intake needs VIN/photo/service-history capture and no diesel/heavy-duty filter.',
    nextAction: 'Build mobile intake for VIN, photos, mileage, authorization, repair category, estimate, and before/after proof.',
    expectedRevenueOrOperationalValue: 'Creates immediate proof-of-work and local cashflow for batteries, brakes, starters, alternators, cooling, suspension, diagnostics, and no-starts.',
    securityRisk: 'medium',
    testVerificationMethod: 'Vehicle record validation, image field acceptance, diesel exclusion test, and proof packet generation.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-20',
    dailyRevenueImpact: 9,
    recurringRevenuePotential: 8,
    dataNetworkValue: 8,
    buildDependency: 6,
    systemRiskReduction: 6,
    speedToProofOfWork: 9,
    reusableProductPotential: 8
  },
  {
    id: 'rcs-007-hauling-routes',
    lane: 'Hauling',
    systemModule: 'Hauling and Route Stacking',
    repoOrPlatform: 'Already Here hauling module',
    affectedDataTable: 'hauling_jobs, routes, contacts, opportunities, analytics_events',
    revenueLaneSupported: 'Local hauling, cleanout, delivery, route stacking',
    priority: 'P1',
    blocker: 'Route profitability model is not yet tied to lead capture and review actions.',
    nextAction: 'Add route stack fields for pickup, dropoff, load type, revenue, mileage, margin, and route-fit score.',
    expectedRevenueOrOperationalValue: 'Combines jobs into profitable same-day routes and improves odds of hitting $500/day with fewer miles.',
    securityRisk: 'low',
    testVerificationMethod: 'Route score test using total revenue, mileage, distance, and urgency.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-20',
    dailyRevenueImpact: 9,
    recurringRevenuePotential: 7,
    dataNetworkValue: 8,
    buildDependency: 6,
    systemRiskReduction: 5,
    speedToProofOfWork: 9,
    reusableProductPotential: 8
  },
  {
    id: 'rcs-008-procurement',
    lane: 'Procurement',
    systemModule: 'Procurement Module',
    repoOrPlatform: 'Already Here certification/procurement workflow',
    affectedDataTable: 'procurement_targets, vendors, organizations, contacts, proof_of_work',
    revenueLaneSupported: 'Government, vendor, healthcare, and enterprise procurement',
    priority: 'P1',
    blocker: 'Procurement targets exist conceptually but need portal, contact, deadline, compliance, and next-action records.',
    nextAction: 'Track procurement targets with approval-gated submissions and no auto-certification or legal attestation.',
    expectedRevenueOrOperationalValue: 'Improves access to higher-ticket recurring vendor and procurement channels while keeping compliance risk controlled.',
    securityRisk: 'high',
    testVerificationMethod: 'Submission-block test, compliance field validation, and audit log verification.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-21',
    dailyRevenueImpact: 7,
    recurringRevenuePotential: 10,
    dataNetworkValue: 9,
    buildDependency: 7,
    systemRiskReduction: 9,
    speedToProofOfWork: 6,
    reusableProductPotential: 8
  },
  {
    id: 'rcs-009-product-affiliate',
    lane: 'Product / Affiliate',
    systemModule: 'Product and Affiliate Module',
    repoOrPlatform: 'Already Here platform / FLY Design Vault proof lane',
    affectedDataTable: 'products, affiliate_links, analytics_events, opportunities',
    revenueLaneSupported: 'Digital products, affiliate offers, AI automation products',
    priority: 'P2',
    blocker: 'Product catalog and attribution records are not yet canonical.',
    nextAction: 'Create product, offer, affiliate, commission, and conversion tracking fields with proof-first rules.',
    expectedRevenueOrOperationalValue: 'Creates reusable product revenue and attribution data without distracting from immediate service revenue.',
    securityRisk: 'medium',
    testVerificationMethod: 'Catalog validation and attribution event test.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-22',
    dailyRevenueImpact: 5,
    recurringRevenuePotential: 9,
    dataNetworkValue: 7,
    buildDependency: 5,
    systemRiskReduction: 4,
    speedToProofOfWork: 7,
    reusableProductPotential: 10
  },
  {
    id: 'rcs-010-review-buttons',
    lane: 'Workflow',
    systemModule: 'Review / Pass / Reply Buttons',
    repoOrPlatform: 'Revenue Command Dashboard',
    affectedDataTable: 'reviews, ai_actions, conversations, audit_logs',
    revenueLaneSupported: 'All inbound leads and opportunities',
    priority: 'P0',
    blocker: 'Raw opportunities need fast human decisions without external sends.',
    nextAction: 'Add approval-safe local review actions that return draft states and audit records but do not contact anyone.',
    expectedRevenueOrOperationalValue: 'Turns every lead interaction into structured training data and shortens time-to-action.',
    securityRisk: 'medium',
    testVerificationMethod: 'POST action test for review, pass, reply, quote, schedule, and prove; verify persistedExternally=false.',
    status: 'in_progress',
    recommendedFollowUpDate: BASE_FOLLOW_UP,
    dailyRevenueImpact: 9,
    recurringRevenuePotential: 8,
    dataNetworkValue: 10,
    buildDependency: 9,
    systemRiskReduction: 8,
    speedToProofOfWork: 10,
    reusableProductPotential: 9
  },
  {
    id: 'rcs-011-codex-changelog',
    lane: 'DevOps',
    systemModule: 'Codex Changelog Viewer',
    repoOrPlatform: 'GitHub / Vercel',
    affectedDataTable: 'codex_changelog, system_health_signals, audit_logs',
    revenueLaneSupported: 'Build trust and rollback speed',
    priority: 'P1',
    blocker: 'Build events and deployment outcomes are spread across GitHub, Vercel, Gmail, and memory.',
    nextAction: 'Normalize commits, deployment states, CI failures, fixes, and rollback candidates into codex_changelog records.',
    expectedRevenueOrOperationalValue: 'Reduces downtime and makes the platform more sellable as a controlled operational system.',
    securityRisk: 'low',
    testVerificationMethod: 'Static changelog seed record validation and Vercel status field check.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-21',
    dailyRevenueImpact: 5,
    recurringRevenuePotential: 7,
    dataNetworkValue: 8,
    buildDependency: 7,
    systemRiskReduction: 9,
    speedToProofOfWork: 8,
    reusableProductPotential: 8
  },
  {
    id: 'rcs-012-catch-correct',
    lane: 'Learning System',
    systemModule: 'Lifelong Catch and Correct Side Panel',
    repoOrPlatform: 'Already Here AI agent dashboard',
    affectedDataTable: 'catch_correct_events, ai_actions, proof_of_work, audit_logs',
    revenueLaneSupported: 'All systems, proof-of-work, training data',
    priority: 'P1',
    blocker: 'Failures, corrections, and operating rules are not yet a first-class data product.',
    nextAction: 'Capture every failed lead action, CI issue, missed follow-up, bad route, and correction as a reusable rule.',
    expectedRevenueOrOperationalValue: 'Builds a compounding operational intelligence layer and reduces repeated mistakes.',
    securityRisk: 'medium',
    testVerificationMethod: 'Correction event creation test and rule reuse assertion.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-21',
    dailyRevenueImpact: 7,
    recurringRevenuePotential: 8,
    dataNetworkValue: 10,
    buildDependency: 8,
    systemRiskReduction: 10,
    speedToProofOfWork: 8,
    reusableProductPotential: 9
  },
  {
    id: 'rcs-013-mobile-readiness',
    lane: 'Mobile Operations',
    systemModule: 'Mobile-Ready Revenue Command',
    repoOrPlatform: 'Vercel / PWA surface',
    affectedDataTable: 'ai_actions, proof_of_work, analytics_events',
    revenueLaneSupported: 'Field work, AutoWorks, hauling, dispatch',
    priority: 'P1',
    blocker: 'Every field workflow must be usable from phone first.',
    nextAction: 'Keep Revenue Command UI small-screen friendly with large buttons and local-only action states.',
    expectedRevenueOrOperationalValue: 'Allows Stephen to capture, review, and act from field locations without laptop dependency.',
    securityRisk: 'medium',
    testVerificationMethod: 'Live page render check and mobile viewport CSS smoke test.',
    status: 'in_progress',
    recommendedFollowUpDate: '2026-06-20',
    dailyRevenueImpact: 8,
    recurringRevenuePotential: 7,
    dataNetworkValue: 7,
    buildDependency: 6,
    systemRiskReduction: 6,
    speedToProofOfWork: 9,
    reusableProductPotential: 8
  },
  {
    id: 'rcs-014-seo-analytics',
    lane: 'Growth',
    systemModule: 'SEO and Analytics Data Layer',
    repoOrPlatform: 'alreadyherellc.com / Vercel analytics',
    affectedDataTable: 'analytics_events, leads, opportunities, products',
    revenueLaneSupported: 'Organic inbound revenue and attribution',
    priority: 'P1',
    blocker: 'Analytics events need to be tied to lead/opportunity outcomes, not just page views.',
    nextAction: 'Record source, page, CTA, module, action, and conversion outcome into analytics_events.',
    expectedRevenueOrOperationalValue: 'Shows which pages, modules, and services produce real leads and booked revenue.',
    securityRisk: 'medium',
    testVerificationMethod: 'Analytics event field validation and no-PII default test.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-22',
    dailyRevenueImpact: 6,
    recurringRevenuePotential: 8,
    dataNetworkValue: 9,
    buildDependency: 6,
    systemRiskReduction: 5,
    speedToProofOfWork: 7,
    reusableProductPotential: 8
  },
  {
    id: 'rcs-015-security-audit',
    lane: 'Security',
    systemModule: 'Hardened Security and Audit Gate',
    repoOrPlatform: 'Next.js API / future OCI backend',
    affectedDataTable: 'audit_logs, ai_actions, system_health_signals',
    revenueLaneSupported: 'All modules',
    priority: 'P0',
    blocker: 'External actions must remain blocked unless owner-approved and auditable.',
    nextAction: 'Force all risky operations into approval gates and record action attempts with persistedExternally=false until explicit approval.',
    expectedRevenueOrOperationalValue: 'Prevents costly mistakes while allowing fast proof-of-work demonstrations.',
    securityRisk: 'high',
    testVerificationMethod: 'Blocked operation test for email, deploy, payment, credential, application, and live-trade actions.',
    status: 'in_progress',
    recommendedFollowUpDate: BASE_FOLLOW_UP,
    dailyRevenueImpact: 8,
    recurringRevenuePotential: 9,
    dataNetworkValue: 8,
    buildDependency: 10,
    systemRiskReduction: 10,
    speedToProofOfWork: 8,
    reusableProductPotential: 9
  },
  {
    id: 'rcs-016-github-vercel-health',
    lane: 'System Health',
    systemModule: 'GitHub and Vercel Health Signals',
    repoOrPlatform: 'GitHub / Vercel',
    affectedDataTable: 'system_health_signals, codex_changelog, audit_logs',
    revenueLaneSupported: 'Platform reliability and sales trust',
    priority: 'P1',
    blocker: 'Some repos have recent failed/no-job workflows and Vercel quota/deployment instability signals.',
    nextAction: 'Normalize repo, workflow, deployment, state, failure reason, and next fix into system_health_signals.',
    expectedRevenueOrOperationalValue: 'Keeps revenue-facing pages stable and prevents broken demos from damaging sales trust.',
    securityRisk: 'low',
    testVerificationMethod: 'Health signal record validation and deployment status smoke check.',
    status: 'ready_for_build',
    recommendedFollowUpDate: '2026-06-20',
    dailyRevenueImpact: 6,
    recurringRevenuePotential: 8,
    dataNetworkValue: 8,
    buildDependency: 8,
    systemRiskReduction: 10,
    speedToProofOfWork: 8,
    reusableProductPotential: 7
  },
  {
    id: 'rcs-017-profitenginev5-ci',
    lane: 'System Health',
    systemModule: 'ProfitEngine v5 CI Recovery',
    repoOrPlatform: 'quantam101/profitenginev5',
    affectedDataTable: 'system_health_signals, codex_changelog, catch_correct_events',
    revenueLaneSupported: 'Automation product credibility',
    priority: 'P1',
    blocker: 'Recent CI signals show Stage 1 lint/unit/types or e2e failures and skipped later stages.',
    nextAction: 'Record CI failure as a catch-correct event and isolate whether failures are lint, types, workflow condition, or e2e route regression.',
    expectedRevenueOrOperationalValue: 'Prevents unstable automation demos from undermining productized AI revenue offers.',
    securityRisk: 'medium',
    testVerificationMethod: 'CI signal record test and no-job workflow classification.',
    status: 'blocked',
    recommendedFollowUpDate: '2026-06-20',
    dailyRevenueImpact: 4,
    recurringRevenuePotential: 8,
    dataNetworkValue: 7,
    buildDependency: 6,
    systemRiskReduction: 10,
    speedToProofOfWork: 5,
    reusableProductPotential: 7
  },
  {
    id: 'rcs-018-oci-backend',
    lane: 'Backend',
    systemModule: 'OCI Backend Health',
    repoOrPlatform: 'Oracle Cloud / future backend',
    affectedDataTable: 'system_health_signals, audit_logs, proof_of_work',
    revenueLaneSupported: 'Backend resiliency and future paid systems',
    priority: 'P2',
    blocker: 'OCI/backend health remains a dependency but should not block immediate owned-data and local-first proof work.',
    nextAction: 'Track OCI/backend health as a system signal and keep revenue modules local-first until backend is verified.',
    expectedRevenueOrOperationalValue: 'Reduces infrastructure fragility while preserving speed to proof-of-work.',
    securityRisk: 'medium',
    testVerificationMethod: 'Backend optionality check: local Revenue Command must work without OCI.',
    status: 'needs_verification',
    recommendedFollowUpDate: '2026-06-22',
    dailyRevenueImpact: 4,
    recurringRevenuePotential: 8,
    dataNetworkValue: 7,
    buildDependency: 5,
    systemRiskReduction: 9,
    speedToProofOfWork: 5,
    reusableProductPotential: 7
  }
];

export function scoreRecord(record: RevenueCommandRecord): number {
  return (
    record.dailyRevenueImpact * 3 +
    record.recurringRevenuePotential * 2 +
    record.dataNetworkValue * 3 +
    record.buildDependency * 2 +
    record.systemRiskReduction * 2 +
    record.speedToProofOfWork * 2 +
    record.reusableProductPotential * 2
  );
}

export function getDatabaseReadyRecords(): RevenueCommandRecord[] {
  return [...RAW_RECORDS].sort((left, right) => scoreRecord(right) - scoreRecord(left));
}

export function getExecutiveBuildPlan(): ExecutiveBuildAction[] {
  return getDatabaseReadyRecords().slice(0, 8).map((record, index) => ({
    rank: index + 1,
    title: record.systemModule,
    objective: record.nextAction,
    ownerValue: record.expectedRevenueOrOperationalValue,
    proofMethod: record.testVerificationMethod,
    targetOutcome: `${record.affectedDataTable} supports ${record.revenueLaneSupported}`,
    priority: record.priority
  }));
}

export function applyReviewAction(recordId: string, action: ReviewAction): ReviewActionResult {
  const record = getDatabaseReadyRecords().find((candidate) => candidate.id === recordId);
  const stateByAction: Record<ReviewAction, ReviewActionResult['nextLocalState']> = {
    review: 'reviewed',
    pass: 'passed',
    reply: 'reply_drafted',
    assign: 'assigned',
    quote: 'quoted',
    schedule: 'scheduled',
    prove: 'proof_recorded'
  };

  return {
    ok: true,
    action,
    recordId,
    record,
    persistedExternally: false,
    approvalRequired: ['reply', 'assign', 'quote', 'schedule'].includes(action),
    message: record
      ? `${action} action staged locally for ${record.systemModule}. No external send, deploy, credential, money, or submission action was executed.`
      : `${action} action staged locally for unknown record. No external action was executed.`,
    nextLocalState: stateByAction[action]
  };
}

export function getRevenueCommandSpineResponse(now: Date = new Date()): RevenueCommandSpineResponse {
  return {
    ok: true,
    service: 'already-here-revenue-command-spine',
    generatedAt: now.toISOString(),
    repo: 'quantam101/already-here-llc',
    databaseRole: 'owned_core_asset_layer',
    externalActions: 'blocked_by_default',
    executiveBuildPlan: getExecutiveBuildPlan(),
    records: getDatabaseReadyRecords(),
    databaseTables: DATABASE_TABLES,
    approvalActions: APPROVAL_ACTIONS,
    proofOfWorkDemos: [
      'Revenue Command Spine API smoke test',
      'Mobile Revenue Command page render test',
      'Review / Pass / Reply local action test',
      '$500 revenue priority scoring test',
      'No external action approval-gate test'
    ]
  };
}
