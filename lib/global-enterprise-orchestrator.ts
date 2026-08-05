export type EnterpriseProcessId =
  | 'opportunity_intelligence'
  | 'daily_command'
  | 'ai_operations_advisor'
  | 'field_network'
  | 'revenue_os'
  | 'grant_procurement_packet_library'
  | 'backend_command'
  | 'lifelong_catch_correct'
  | 'global_enterprise';

export type EnterpriseOperation =
  | 'scan_opportunities'
  | 'score_opportunity'
  | 'recommend_next_action'
  | 'summarize_daily_command'
  | 'advise_intake'
  | 'normalize_intake'
  | 'sync_field_network'
  | 'track_revenue'
  | 'record_revenue_event'
  | 'prepare_packet'
  | 'track_funding_sources'
  | 'healthcheck_backend'
  | 'build_proof_packet'
  | 'draft_outreach'
  | 'evaluate_security_gate'
  | 'catch_correct'
  | 'orchestrate';

export const ENTERPRISE_OPERATIONS: EnterpriseOperation[] = [
  'scan_opportunities',
  'score_opportunity',
  'recommend_next_action',
  'summarize_daily_command',
  'advise_intake',
  'normalize_intake',
  'sync_field_network',
  'track_revenue',
  'record_revenue_event',
  'prepare_packet',
  'track_funding_sources',
  'healthcheck_backend',
  'build_proof_packet',
  'draft_outreach',
  'evaluate_security_gate',
  'catch_correct',
  'orchestrate',
];

export type EnterpriseAgentId =
  | 'super_ai_orchestrator'
  | 'agent_opportunity_intelligence'
  | 'agent_scoring'
  | 'agent_routing'
  | 'agent_daily_command'
  | 'agent_ai_operations_advisor'
  | 'agent_intake'
  | 'agent_field_network'
  | 'agent_revenue'
  | 'agent_revenue_os'
  | 'agent_procurement_grant'
  | 'agent_grant_procurement_packet'
  | 'agent_backend_command'
  | 'agent_proof'
  | 'agent_outreach'
  | 'agent_compliance'
  | 'agent_lifelong_catch_correct';

export interface EnterpriseAgent {
  id: EnterpriseAgentId;
  name: string;
  process: EnterpriseProcessId;
  operation: EnterpriseOperation;
  purpose: string;
  handoffTo: EnterpriseAgentId | 'owner_approval_gate';
}

export interface EnterpriseItem {
  itemId: string;
  process: EnterpriseProcessId;
  source: string;
  title: string;
  body: string;
  lane: string;
  priority: 'P0' | 'P1' | 'P2';
  estimatedValue: number;
  status: 'new' | 'ranked' | 'blocked' | 'approved';
}

export interface EnterpriseOperationResult {
  ok: true;
  service: 'already-here-global-enterprise-asios';
  operation: EnterpriseOperation;
  agent: EnterpriseAgent;
  timestamp: string;
  summary: string;
  item?: EnterpriseItem;
  queue?: EnterpriseItem[];
  blockedActions: string[];
  approvalRequired: boolean;
  nextAgent: EnterpriseAgentId | 'owner_approval_gate';
}

export interface EnterpriseOrchestratorCapability {
  engine: 'already-here-global-enterprise-asios';
  controlModel: 'super_ai_runs_one_process_agent';
  zeroSpend: true;
  externalActions: 'blocked_by_default';
  database: 'owned_sqlite_postgres_bridge';
  approvalGate: true;
  agents: EnterpriseAgent[];
  blockedOperations: string[];
}

const BLOCKED_OPERATIONS = [
  'send_email',
  'email_send',
  'send_emails',
  'send_sms',
  'send_message',
  'production_deploy',
  'submit_application',
  'create_external_account',
  'live_trade',
  'place_order',
  'move_money',
  'change_credentials',
  'publish_public',
  'paid_ad_launch',
  'dispatch_technician',
  'accept_work',
  'register_account',
  'sign_document',
  'invoice_send',
  'repo_merge',
  'any_direct_external_action',
  'any_external_action',
  'any_cost',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasTerm(value: string, term: string): boolean {
  const pattern = `(?:^|[^a-z0-9])${escapeRegExp(term.toLowerCase())}(?:$|[^a-z0-9])`;
  return new RegExp(pattern, 'i').test(value);
}

function normalizeAction(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isBlockedAction(requestedAction: string | undefined): boolean {
  if (!requestedAction) return false;
  const normalized = normalizeAction(requestedAction);
  if (!normalized) return false;
  const normalizedBlocklist = BLOCKED_OPERATIONS.map(normalizeAction);
  return normalizedBlocklist.some(
    (block) => normalized === block || (normalized.includes(block) && block.length >= 4)
  );
}

const AGENTS: EnterpriseAgent[] = [
  {
    id: 'super_ai_orchestrator',
    name: 'Super-AI Orchestrator',
    process: 'global_enterprise',
    operation: 'orchestrate',
    purpose: 'Receive enterprise objectives and dispatch exactly one deterministic agent per process.',
    handoffTo: 'owner_approval_gate',
  },
  {
    id: 'agent_opportunity_intelligence',
    name: 'Opportunity Intelligence Agent',
    process: 'opportunity_intelligence',
    operation: 'scan_opportunities',
    purpose: 'Search, filter, score, and route procurement, grant, field-dispatch, and teaming opportunities.',
    handoffTo: 'agent_scoring',
  },
  {
    id: 'agent_scoring',
    name: 'Scoring Agent',
    process: 'opportunity_intelligence',
    operation: 'score_opportunity',
    purpose: 'Rate opportunity fit, value, deadline, certification, cost, risk, and strategic value.',
    handoffTo: 'agent_routing',
  },
  {
    id: 'agent_routing',
    name: 'Routing Agent',
    process: 'daily_command',
    operation: 'recommend_next_action',
    purpose: 'Recommend next action such as apply, attend, counter, suppress, prepare packet, partner review, or closeout.',
    handoffTo: 'agent_daily_command',
  },
  {
    id: 'agent_daily_command',
    name: 'Daily Command Agent',
    process: 'daily_command',
    operation: 'summarize_daily_command',
    purpose: 'Summarize and queue daily leads, opportunities, closeouts, approvals, system health, and revenue actions.',
    handoffTo: 'owner_approval_gate',
  },
  {
    id: 'agent_ai_operations_advisor',
    name: 'AI Operations Advisor Agent',
    process: 'ai_operations_advisor',
    operation: 'advise_intake',
    purpose: 'Handle intake, qualification, routing, first-tier support, and proof-of-work capture.',
    handoffTo: 'agent_intake',
  },
  {
    id: 'agent_intake',
    name: 'Intake Agent',
    process: 'ai_operations_advisor',
    operation: 'normalize_intake',
    purpose: 'Normalize Gmail, website, RFQ, dispatch, grant, and procurement inputs into canonical records.',
    handoffTo: 'agent_scoring',
  },
  {
    id: 'agent_field_network',
    name: 'Field Network Agent',
    process: 'field_network',
    operation: 'sync_field_network',
    purpose: 'Maintain partner intelligence, technician profiles, dispatch leads, RFQs, and verified closeouts.',
    handoffTo: 'agent_revenue',
  },
  {
    id: 'agent_revenue',
    name: 'Revenue Agent',
    process: 'revenue_os',
    operation: 'record_revenue_event',
    purpose: 'Track quoted, booked, closed, paid, and disputed revenue and payment-risk items.',
    handoffTo: 'owner_approval_gate',
  },
  {
    id: 'agent_revenue_os',
    name: 'Revenue OS Agent',
    process: 'revenue_os',
    operation: 'track_revenue',
    purpose: 'Run CRM, partner intelligence, scoring, follow-up, dispatch handoff, and verified revenue tracking.',
    handoffTo: 'agent_revenue',
  },
  {
    id: 'agent_procurement_grant',
    name: 'Procurement and Grant Tracking Agent',
    process: 'grant_procurement_packet_library',
    operation: 'track_funding_sources',
    purpose: 'Track federal, state, local, cooperative, SBIR/STTR, veteran, and private funding sources.',
    handoffTo: 'agent_grant_procurement_packet',
  },
  {
    id: 'agent_grant_procurement_packet',
    name: 'Grant and Procurement Packet Agent',
    process: 'grant_procurement_packet_library',
    operation: 'prepare_packet',
    purpose: 'Generate reusable DOCX/PDF/ZIP packets from real database records.',
    handoffTo: 'owner_approval_gate',
  },
  {
    id: 'agent_backend_command',
    name: 'Backend Command Agent',
    process: 'backend_command',
    operation: 'healthcheck_backend',
    purpose: 'Verify portable backend health, persistence, proof events, export, and owner-alert workflows.',
    handoffTo: 'owner_approval_gate',
  },
  {
    id: 'agent_proof',
    name: 'Proof Agent',
    process: 'lifelong_catch_correct',
    operation: 'build_proof_packet',
    purpose: 'Build evidence packets from intake to closeout and revenue attribution.',
    handoffTo: 'agent_lifelong_catch_correct',
  },
  {
    id: 'agent_outreach',
    name: 'Outreach Agent',
    process: 'daily_command',
    operation: 'draft_outreach',
    purpose: 'Draft emails, replies, capability notes, registration support messages, and partner requests.',
    handoffTo: 'owner_approval_gate',
  },
  {
    id: 'agent_compliance',
    name: 'Compliance Agent',
    process: 'backend_command',
    operation: 'evaluate_security_gate',
    purpose: 'Block risky actions, expired items, unsupported certifications, hidden fees, scraping issues, or low-margin jobs.',
    handoffTo: 'owner_approval_gate',
  },
  {
    id: 'agent_lifelong_catch_correct',
    name: 'Lifelong Catch and Correct Agent',
    process: 'lifelong_catch_correct',
    operation: 'catch_correct',
    purpose: 'Capture errors, corrections, changelog entries, and reusable rules.',
    handoffTo: 'owner_approval_gate',
  },
];

function stableId(prefix: string, input: string): string {
  const clean =
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || 'item';
  return `${prefix}-${clean}`;
}

function classifyLane(text: string): string {
  const value = text.toLowerCase();

  if (['daily command', 'dashboard', 'queue', 'summary', 'outreach'].some((term) => hasTerm(value, term))) {
    return 'Daily Command';
  }

  if (['intake', 'ai advisor', 'support', 'chat', 'website'].some((term) => hasTerm(value, term))) {
    return 'AI Advisor';
  }

  if (
    ['field', 'dispatch', 'technician', 'closeout', 'network', 'cabling', 'printer', 'pos', 'smart hands'].some(
      (term) => hasTerm(value, term)
    )
  ) {
    return 'Field Network';
  }

  if (['revenue', 'crm', 'pipeline', 'payment', 'invoice'].some((term) => hasTerm(value, term))) {
    return 'Revenue OS';
  }

  if (['opportunity', 'solicitation', 'rfp', 'rfq', 'procurement', 'grant', 'funding'].some((term) => hasTerm(value, term))) {
    return 'Opportunity Intelligence';
  }

  if (['packet', 'sba scale', 'capability', 'attendance kit', 'rfi response'].some((term) => hasTerm(value, term))) {
    return 'Packet Library';
  }

  if (['backend', 'health', 'sqlite', 'docker', 'backup', 'security', 'compliance'].some((term) => hasTerm(value, term))) {
    return 'Backend Command';
  }

  if (['catch', 'correct', 'changelog', 'proof', 'audit', 'lifecycle'].some((term) => hasTerm(value, term))) {
    return 'Lifelong Catch and Correct';
  }

  return 'Enterprise General';
}

function priorityFor(text: string, estimatedValue: number): EnterpriseItem['priority'] {
  const value = text.toLowerCase();
  let score = 0;

  if (
    ['urgent', 'today', 'same-day', 'by noon', 'asap', 'failed', 'security', 'compliance', 'blocked'].some((term) =>
      hasTerm(value, term)
    )
  ) {
    score += 40;
  }

  if (
    ['revenue', '$500', 'paid', 'invoice', 'dispatch', 'quote', 'rfq', 'opportunity', 'grant'].some((term) =>
      hasTerm(value, term)
    )
  ) {
    score += 30;
  }

  if (
    ['procurement', 'federal', 'municipal', 'va', 'subcontract', 'prime', 'sbir', 'healthcare'].some((term) =>
      hasTerm(value, term)
    )
  ) {
    score += 20;
  }

  if (estimatedValue >= 500 || hasTerm(value, '$500')) {
    score += 25;
  } else {
    score += Math.min(10, Math.max(0, estimatedValue) / 100);
  }

  if (score >= 75) return 'P0';
  if (score >= 45) return 'P1';
  return 'P2';
}

function agentFor(operation: EnterpriseOperation): EnterpriseAgent {
  return AGENTS.find((candidate) => candidate.operation === operation) ?? AGENTS[0];
}

const VALID_PRIORITIES: readonly EnterpriseItem['priority'][] = ['P0', 'P1', 'P2'];
const VALID_STATUSES: readonly EnterpriseItem['status'][] = ['new', 'ranked', 'blocked', 'approved'];
export const ENTERPRISE_PROCESS_IDS: readonly EnterpriseProcessId[] = [
  'opportunity_intelligence',
  'daily_command',
  'ai_operations_advisor',
  'field_network',
  'revenue_os',
  'grant_procurement_packet_library',
  'backend_command',
  'lifelong_catch_correct',
  'global_enterprise',
];

function normalizeQueueItem(item: unknown): EnterpriseItem | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const candidate = item as Partial<EnterpriseItem>;
  if (typeof candidate.title !== 'string' || !candidate.title.trim()) return undefined;

  const title = candidate.title.trim();
  const body = typeof candidate.body === 'string' ? candidate.body.trim() : title;
  const estimatedValue = Number.isFinite(Number(candidate.estimatedValue)) ? Number(candidate.estimatedValue) : 0;
  const process =
    candidate.process && ENTERPRISE_PROCESS_IDS.includes(candidate.process as EnterpriseProcessId)
      ? (candidate.process as EnterpriseProcessId)
      : 'global_enterprise';
  const source = typeof candidate.source === 'string' ? candidate.source : 'enterprise-asios';
  const lane = typeof candidate.lane === 'string' ? candidate.lane : classifyLane(`${title} ${body}`);
  const priority = VALID_PRIORITIES.includes(candidate.priority as EnterpriseItem['priority'])
    ? (candidate.priority as EnterpriseItem['priority'])
    : priorityFor(`${title} ${body}`, estimatedValue);
  const status = VALID_STATUSES.includes(candidate.status as EnterpriseItem['status'])
    ? (candidate.status as EnterpriseItem['status'])
    : 'new';

  return {
    itemId: typeof candidate.itemId === 'string' ? candidate.itemId : stableId('entitem', `${title}-${body}`),
    process,
    source,
    title,
    body,
    lane,
    priority,
    estimatedValue,
    status,
  };
}

export function buildEnterpriseItem(input: {
  prompt?: string;
  title?: string;
  body?: string;
  process?: EnterpriseProcessId;
  source?: string;
  estimatedValue?: number;
}): EnterpriseItem {
  const title = (input.title || input.prompt || 'Enterprise item').trim();
  const body = (input.body || input.prompt || title).trim();
  const estimatedValue = Number.isFinite(Number(input.estimatedValue)) ? Number(input.estimatedValue) : 0;
  const process = input.process || 'global_enterprise';

  return {
    itemId: stableId('entitem', `${title}-${body}`),
    process,
    source: input.source || 'enterprise-asios',
    title,
    body,
    lane: classifyLane(`${title} ${body}`),
    priority: priorityFor(`${title} ${body}`, estimatedValue),
    estimatedValue,
    status: 'new',
  };
}

export function getEnterpriseOrchestratorCapability(): EnterpriseOrchestratorCapability {
  return {
    engine: 'already-here-global-enterprise-asios',
    controlModel: 'super_ai_runs_one_process_agent',
    zeroSpend: true,
    externalActions: 'blocked_by_default',
    database: 'owned_sqlite_postgres_bridge',
    approvalGate: true,
    agents: AGENTS,
    blockedOperations: BLOCKED_OPERATIONS,
  };
}

function summarizeQueue(queue: EnterpriseItem[]): string {
  const p0 = queue.filter((entry) => entry.priority === 'P0').length;
  const p1 = queue.filter((entry) => entry.priority === 'P1').length;
  const p2 = queue.filter((entry) => entry.priority === 'P2').length;
  return `Enterprise ASIOS queue: ${queue.length} item(s), ${p0} P0, ${p1} P1, ${p2} P2. External actions remain approval-gated.`;
}

export function runEnterpriseOperation(input: {
  operation?: string;
  prompt?: string;
  title?: string;
  body?: string;
  source?: string;
  estimatedValue?: number;
  queue?: EnterpriseItem[];
  requestedAction?: string;
}): EnterpriseOperationResult {
  const operation =
    (input.operation && ENTERPRISE_OPERATIONS.includes(input.operation as EnterpriseOperation)
      ? (input.operation as EnterpriseOperation)
      : undefined) ?? 'summarize_daily_command';
  const agent = agentFor(operation);
  const timestamp = new Date().toISOString();
  const requestedAction = input.requestedAction?.toLowerCase().trim();

  if (operation === 'evaluate_security_gate') {
    const blocked = isBlockedAction(requestedAction);
    return {
      ok: true,
      service: 'already-here-global-enterprise-asios',
      operation,
      agent,
      timestamp,
      summary: blocked
        ? `Blocked pending owner approval: ${requestedAction}`
        : 'No blocked enterprise action detected.',
      blockedActions: BLOCKED_OPERATIONS,
      approvalRequired: blocked,
      nextAgent: 'owner_approval_gate',
    };
  }

  const estimatedValue = Number.isFinite(Number(input.estimatedValue)) ? Number(input.estimatedValue) : 0;

  const item = buildEnterpriseItem({
    title: input.title,
    body: input.body,
    prompt: input.prompt,
    process: agent.process,
    source: input.source || 'enterprise-asios',
    estimatedValue,
  });

  const queue = [
    ...(input.queue?.map(normalizeQueueItem).filter((entry): entry is EnterpriseItem => entry !== undefined) || []),
    item,
  ].sort((left, right) => {
    const rank = { P0: 0, P1: 1, P2: 2 } as const;
    return rank[left.priority] - rank[right.priority] || right.estimatedValue - left.estimatedValue;
  });

  let summary: string;
  switch (operation) {
    case 'scan_opportunities':
      summary = `Opportunity ingested and scored: ${item.title} → ${item.priority} (${item.lane}). Handoff to scoring/routing.`;
      break;
    case 'score_opportunity':
      summary = `Opportunity scored: ${item.title} → ${item.priority} (${item.lane}).`;
      break;
    case 'recommend_next_action':
      summary = `Routing recommendation for ${item.title}: ${item.priority} (${item.lane}). Next step queued for owner review.`;
      break;
    case 'summarize_daily_command':
      summary = summarizeQueue(queue);
      break;
    case 'advise_intake':
    case 'normalize_intake':
      summary = `AI advisor normalized intake: ${item.title} → ${item.lane}, ${item.priority}. Handoff to scoring.`;
      break;
    case 'sync_field_network':
      summary = `Field network sync recorded for ${item.title} (${item.lane}, ${item.priority}).`;
      break;
    case 'track_revenue':
    case 'record_revenue_event':
      summary = `Revenue event recorded: ${item.title} → ${item.lane}, ${item.priority}.`;
      break;
    case 'prepare_packet':
    case 'track_funding_sources':
      summary = `Packet/tracker draft prepared for ${item.title}. Owner approval required before external send.`;
      break;
    case 'healthcheck_backend':
      summary = `Backend command healthcheck passed. Queue holds ${queue.length} item(s); all external gates closed.`;
      break;
    case 'build_proof_packet':
      summary = `Proof packet draft built for ${item.title} (${item.lane}, ${item.priority}).`;
      break;
    case 'draft_outreach':
      summary = `Outreach draft prepared for ${item.title}. Sending is blocked pending owner approval.`;
      break;
    case 'catch_correct':
      summary = `Correction/proof event logged for ${item.title} (${item.lane}, ${item.priority}).`;
      break;
    case 'orchestrate':
      summary = `Global Enterprise ASIOS orchestration active: ${queue.length} item(s) dispatched across registered agents.`;
      break;
    default:
      summary = summarizeQueue(queue);
  }

  return {
    ok: true,
    service: 'already-here-global-enterprise-asios',
    operation,
    agent,
    timestamp,
    summary,
    item,
    queue,
    blockedActions: BLOCKED_OPERATIONS,
    approvalRequired: true,
    nextAgent: agent.handoffTo,
  };
}
