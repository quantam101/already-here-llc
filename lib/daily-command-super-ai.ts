export type DailyCommandSuperAiOperation =
  | 'ingest_daily_command_item'
  | 'rank_daily_command_item'
  | 'summarize_daily_command_queue'
  | 'render_daily_command_snapshot'
  | 'evaluate_daily_command_security_gate';

export type DailyCommandAgentId =
  | 'agent_daily_command_ingest'
  | 'agent_daily_command_rank'
  | 'agent_daily_command_summary'
  | 'agent_daily_command_snapshot'
  | 'agent_daily_command_security_gate';

export interface DailyCommandSuperAiAgent {
  id: DailyCommandAgentId;
  name: string;
  operation: DailyCommandSuperAiOperation;
  purpose: string;
  handoffTo: DailyCommandAgentId | 'owner_approval_gate';
}

export interface DailyCommandItem {
  itemId: string;
  source: string;
  title: string;
  body: string;
  lane: string;
  priority: 'P0' | 'P1' | 'P2';
  estimatedValue: number;
  status: 'new' | 'ranked' | 'summarized' | 'blocked';
}

export interface DailyCommandSuperAiResult {
  ok: true;
  service: 'already-here-daily-command-super-ai';
  operation: DailyCommandSuperAiOperation;
  agent: DailyCommandSuperAiAgent;
  timestamp: string;
  summary: string;
  item?: DailyCommandItem;
  queue?: DailyCommandItem[];
  blockedActions: string[];
  approvalRequired: boolean;
  nextAgent: DailyCommandAgentId | 'owner_approval_gate';
}

export interface DailyCommandSuperAiCapability {
  engine: 'already-here-super-ai-orchestrator';
  controlModel: 'super_ai_runs_one_operation_agents';
  route: 'daily_command_local_runtime';
  zeroSpend: true;
  externalActions: 'blocked_by_default';
  database: 'owned_command_spine';
  approvalGate: true;
  agents: DailyCommandSuperAiAgent[];
  blockedOperations: string[];
}

const DAILY_COMMAND_AGENTS: DailyCommandSuperAiAgent[] = [
  {
    id: 'agent_daily_command_ingest',
    name: 'Daily Command Ingest Agent',
    operation: 'ingest_daily_command_item',
    purpose: 'Ingest one Daily Command item only.',
    handoffTo: 'agent_daily_command_rank'
  },
  {
    id: 'agent_daily_command_rank',
    name: 'Daily Command Rank Agent',
    operation: 'rank_daily_command_item',
    purpose: 'Rank one Daily Command item only.',
    handoffTo: 'agent_daily_command_summary'
  },
  {
    id: 'agent_daily_command_summary',
    name: 'Daily Command Summary Agent',
    operation: 'summarize_daily_command_queue',
    purpose: 'Summarize the Daily Command queue only.',
    handoffTo: 'agent_daily_command_snapshot'
  },
  {
    id: 'agent_daily_command_snapshot',
    name: 'Daily Command Snapshot Agent',
    operation: 'render_daily_command_snapshot',
    purpose: 'Render one Daily Command snapshot only.',
    handoffTo: 'owner_approval_gate'
  },
  {
    id: 'agent_daily_command_security_gate',
    name: 'Daily Command Security Gate Agent',
    operation: 'evaluate_daily_command_security_gate',
    purpose: 'Evaluate blocked actions and approval requirements only.',
    handoffTo: 'owner_approval_gate'
  }
];

const BLOCKED_OPERATIONS = [
  'send_email',
  'send_sms',
  'production_deploy',
  'submit_application',
  'create_external_account',
  'live_trade',
  'place_order',
  'move_money',
  'change_credentials',
  'publish_public',
  'paid_ad_launch'
];

function stableId(prefix: string, input: string): string {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'item';
  return `${prefix}-${clean}`;
}

function classifyLane(text: string): string {
  const value = text.toLowerCase();

  if (['vin', 'vehicle', 'battery', 'car', 'hood', 'autoworks'].some((term) => value.includes(term))) {
    return 'AutoWorks';
  }

  if (['haul', 'junk', 'cleanout', 'dump', 'pickup', 'storage'].some((term) => value.includes(term))) {
    return 'Hauling';
  }

  if (['dispatch', 'printer', 'network', 'wireless', 'ap ', 'pos', 'smart hands', 'low voltage'].some((term) => value.includes(term))) {
    return 'Dispatch';
  }

  if (['grant', 'procurement', 'rfp', 'rfq', 'vendor registration'].some((term) => value.includes(term))) {
    return 'Procurement';
  }

  if (['product', 'affiliate', 'gumroad', 'payhip', 'ebook'].some((term) => value.includes(term))) {
    return 'Product / affiliate';
  }

  return 'AI lead capture';
}

function priorityFor(text: string, estimatedValue: number): DailyCommandItem['priority'] {
  const value = text.toLowerCase();
  let score = 0;

  if (['urgent', 'today', 'same-day', 'by noon', 'blocked', 'failed'].some((term) => value.includes(term))) {
    score += 35;
  }

  if (['revenue', '$500', 'paid', 'invoice', 'client', 'dispatch', 'quote'].some((term) => value.includes(term))) {
    score += 35;
  }

  if (['security', 'secret', 'deploy', 'ci', 'quality pipeline'].some((term) => value.includes(term))) {
    score += 20;
  }

  if (estimatedValue >= 500 || value.includes('$500')) {
    score += 25;
  } else {
    score += Math.min(10, Math.max(0, estimatedValue) / 100);
  }

  if (score >= 70) return 'P0';
  if (score >= 45) return 'P1';
  return 'P2';
}

function agentFor(operation: DailyCommandSuperAiOperation): DailyCommandSuperAiAgent {
  return DAILY_COMMAND_AGENTS.find((candidate) => candidate.operation === operation) ?? DAILY_COMMAND_AGENTS[4];
}

export function getDailyCommandSuperAiCapability(): DailyCommandSuperAiCapability {
  return {
    engine: 'already-here-super-ai-orchestrator',
    controlModel: 'super_ai_runs_one_operation_agents',
    route: 'daily_command_local_runtime',
    zeroSpend: true,
    externalActions: 'blocked_by_default',
    database: 'owned_command_spine',
    approvalGate: true,
    agents: DAILY_COMMAND_AGENTS,
    blockedOperations: BLOCKED_OPERATIONS
  };
}

export function buildDailyCommandItem(input: {
  prompt?: string;
  title?: string;
  body?: string;
  source?: string;
  estimatedValue?: number;
}): DailyCommandItem {
  const title = (input.title || input.prompt || 'Daily Command item').trim();
  const body = (input.body || input.prompt || title).trim();
  const estimatedValue = Number.isFinite(Number(input.estimatedValue)) ? Number(input.estimatedValue) : 0;
  const lane = classifyLane(`${title} ${body}`);

  return {
    itemId: stableId('dcitem', `${title}-${body}`),
    source: input.source || 'daily-command',
    title,
    body,
    lane,
    priority: priorityFor(`${title} ${body}`, estimatedValue),
    estimatedValue,
    status: 'ranked'
  };
}

export function runDailyCommandSuperAiOperation(input: {
  operation?: DailyCommandSuperAiOperation;
  prompt?: string;
  title?: string;
  body?: string;
  source?: string;
  estimatedValue?: number;
  queue?: DailyCommandItem[];
  requestedAction?: string;
}): DailyCommandSuperAiResult {
  const operation = input.operation || 'summarize_daily_command_queue';
  const agent = agentFor(operation);
  const timestamp = new Date().toISOString();
  const requestedAction = input.requestedAction?.toLowerCase().trim();

  if (operation === 'evaluate_daily_command_security_gate') {
    const blocked = requestedAction ? BLOCKED_OPERATIONS.includes(requestedAction) : false;
    return {
      ok: true,
      service: 'already-here-daily-command-super-ai',
      operation,
      agent,
      timestamp,
      summary: blocked ? `Blocked pending owner approval: ${requestedAction}` : 'No blocked Daily Command action detected.',
      blockedActions: BLOCKED_OPERATIONS,
      approvalRequired: blocked,
      nextAgent: 'owner_approval_gate'
    };
  }

  const item = buildDailyCommandItem(input);
  const queue = [...(input.queue || []), item].sort((left, right) => {
    const rank = { P0: 0, P1: 1, P2: 2 } as const;
    return rank[left.priority] - rank[right.priority] || right.estimatedValue - left.estimatedValue;
  });

  const p0 = queue.filter((entry) => entry.priority === 'P0').length;
  const p1 = queue.filter((entry) => entry.priority === 'P1').length;
  const p2 = queue.filter((entry) => entry.priority === 'P2').length;

  return {
    ok: true,
    service: 'already-here-daily-command-super-ai',
    operation,
    agent,
    timestamp,
    summary: `Super AI Daily Command queue: ${queue.length} item(s), ${p0} P0, ${p1} P1, ${p2} P2. External actions remain approval-gated.`,
    item,
    queue,
    blockedActions: BLOCKED_OPERATIONS,
    approvalRequired: true,
    nextAgent: agent.handoffTo
  };
}
