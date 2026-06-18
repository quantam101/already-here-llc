import { getDatabaseReadyRecords, type RevenueCommandRecord, type RevenuePriority, type RevenueStatus, type SecurityRisk } from './revenue-command-spine';

export type RevenueAgentPolicy = 'one_agent_one_task';
export type RevenueAgentExecutionScope = 'local_proof_only';

export interface RevenueCommandAgent {
  id: string;
  recordId: string;
  name: string;
  lane: string;
  systemModule: string;
  operation: string;
  affectedDataTable: string;
  revenueLaneSupported: string;
  priority: RevenuePriority;
  status: RevenueStatus;
  securityRisk: SecurityRisk;
  runPolicy: RevenueAgentPolicy;
  executionScope: RevenueAgentExecutionScope;
  nextAction: string;
  handoffTo: 'owner_approval_gate' | 'proof_of_work_queue' | 'lifelong_catch_correct' | 'codex_changelog_viewer';
  blockedExternalActions: string[];
  allowedLocalActions: string[];
  testVerificationMethod: string;
}

export interface RevenueAgentCoverageReport {
  ok: boolean;
  recordCount: number;
  agentCount: number;
  oneAgentPerTask: boolean;
  missingAgentRecordIds: string[];
  duplicateAgentRecordIds: string[];
  duplicateOperations: string[];
}

export const BLOCKED_EXTERNAL_ACTIONS = [
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

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function handoffFor(record: RevenueCommandRecord): RevenueCommandAgent['handoffTo'] {
  if (record.systemModule.includes('Codex')) return 'codex_changelog_viewer';
  if (record.systemModule.includes('Catch and Correct')) return 'lifelong_catch_correct';
  if (record.affectedDataTable.includes('proof_of_work')) return 'proof_of_work_queue';
  return 'owner_approval_gate';
}

function agentNameFor(record: RevenueCommandRecord): string {
  return `${record.systemModule} Agent`;
}

export function buildAgentForRecord(record: RevenueCommandRecord): RevenueCommandAgent {
  return {
    id: `agent_${slug(record.id)}`,
    recordId: record.id,
    name: agentNameFor(record),
    lane: record.lane,
    systemModule: record.systemModule,
    operation: `run_${slug(record.systemModule)}`,
    affectedDataTable: record.affectedDataTable,
    revenueLaneSupported: record.revenueLaneSupported,
    priority: record.priority,
    status: record.status,
    securityRisk: record.securityRisk,
    runPolicy: 'one_agent_one_task',
    executionScope: 'local_proof_only',
    nextAction: record.nextAction,
    handoffTo: handoffFor(record),
    blockedExternalActions: BLOCKED_EXTERNAL_ACTIONS,
    allowedLocalActions: ['review', 'pass', 'reply_draft_only', 'assign_local_only', 'quote_draft_only', 'schedule_draft_only', 'prove_local_only'],
    testVerificationMethod: record.testVerificationMethod
  };
}

export function getRevenueCommandAgents(): RevenueCommandAgent[] {
  return getDatabaseReadyRecords().map(buildAgentForRecord);
}

export function validateRevenueAgentCoverage(): RevenueAgentCoverageReport {
  const records = getDatabaseReadyRecords();
  const agents = getRevenueCommandAgents();
  const recordIds = new Set(records.map((record) => record.id));
  const agentRecordIds = agents.map((agent) => agent.recordId);
  const agentRecordIdSet = new Set(agentRecordIds);
  const operations = agents.map((agent) => agent.operation);

  const duplicateAgentRecordIds = agentRecordIds.filter((recordId, index) => agentRecordIds.indexOf(recordId) !== index);
  const duplicateOperations = operations.filter((operation, index) => operations.indexOf(operation) !== index);
  const missingAgentRecordIds = [...recordIds].filter((recordId) => !agentRecordIdSet.has(recordId));

  const oneAgentPerTask = records.length === agents.length && missingAgentRecordIds.length === 0 && duplicateAgentRecordIds.length === 0 && duplicateOperations.length === 0;

  return {
    ok: oneAgentPerTask,
    recordCount: records.length,
    agentCount: agents.length,
    oneAgentPerTask,
    missingAgentRecordIds,
    duplicateAgentRecordIds,
    duplicateOperations
  };
}
