import { createHash } from 'node:crypto';
import { getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export type ApprovalAction = 'review' | 'approve' | 'reject' | 'pass' | 'reply' | 'assign' | 'schedule' | 'dispatch' | 'archive' | 'escalate';

export interface ApprovalInput {
  targetTable: string;
  targetId: string;
  action: ApprovalAction;
  actorId: string;
  authorityScope?: string;
  note?: string;
  requestId?: string;
  createdAt?: string;
}

export interface ApprovalResult {
  ok: boolean;
  approvalId: string;
  decision: string;
  executionAllowed: boolean;
  externalExecutionAllowed: false;
  errors: string[];
}

const allowedTargetTables = new Set([
  'opportunities', 'leads', 'ai_actions', 'dispatches', 'jobs', 'quotes', 'invoices',
  'procurement_targets', 'products', 'affiliate_links', 'hauling_jobs', 'repair_orders'
]);

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

function decisionFor(action: ApprovalAction): string {
  switch (action) {
    case 'approve': return 'approved';
    case 'reject': return 'rejected';
    case 'pass': return 'passed';
    case 'reply': return 'reply_prepared';
    case 'assign': return 'assignment_approved';
    case 'schedule': return 'schedule_approved';
    case 'dispatch': return 'dispatch_approved';
    case 'archive': return 'archived';
    case 'escalate': return 'escalated';
    default: return 'reviewed';
  }
}

export async function recordApprovalAction(input: ApprovalInput): Promise<ApprovalResult> {
  if (!allowedTargetTables.has(input.targetTable)) {
    return { ok: false, approvalId: '', decision: '', executionAllowed: false, externalExecutionAllowed: false, errors: [`Unsupported approval target: ${input.targetTable}`] };
  }
  const target = getRecord(input.targetTable, input.targetId);
  if (!target) {
    return { ok: false, approvalId: '', decision: '', executionAllowed: false, externalExecutionAllowed: false, errors: [`Target not found: ${input.targetTable}/${input.targetId}`] };
  }
  const now = input.createdAt || new Date().toISOString();
  const requestId = input.requestId || `${input.targetTable}:${input.targetId}:${input.action}:${input.actorId}:${now}`;
  const requestHash = createHash('sha256').update(requestId).digest('hex');
  const approvalId = stableId('approval', requestHash);
  const decision = decisionFor(input.action);
  const executionAllowed = ['approve', 'assign', 'schedule', 'dispatch'].includes(input.action);
  const writes: DatabaseReadyWrite[] = [
    {
      table: 'approval_actions',
      id: approvalId,
      action: 'insert',
      record: {
        id: approvalId,
        target_table: input.targetTable,
        target_id: input.targetId,
        action: input.action,
        actor_id: input.actorId,
        authority_scope: input.authorityScope || 'owner_review',
        decision,
        note: input.note || null,
        request_hash: requestHash,
        execution_allowed: executionAllowed ? 1 : 0,
        external_execution_allowed: 0,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'reviews',
      id: stableId('review', `${approvalId}:review`),
      action: 'insert',
      record: {
        id: stableId('review', `${approvalId}:review`),
        target_table: input.targetTable,
        target_id: input.targetId,
        action: input.action,
        decision,
        persisted_externally: 0,
        approval_required: 0,
        approval_id: approvalId,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'audit_logs',
      id: stableId('audit', `${approvalId}:audit`),
      action: 'insert',
      record: {
        id: stableId('audit', `${approvalId}:audit`),
        actor: input.actorId,
        action: `approval_${input.action}`,
        target_table: input.targetTable,
        target_id: input.targetId,
        risk_level: executionAllowed ? 'high' : 'medium',
        allowed: 1,
        reason: `Approval ledger recorded ${decision}. External execution remains independently blocked.`,
        request_hash: requestHash,
        created_at: now,
        updated_at: now
      }
    }
  ];
  const result = await persistDatabaseReadyWrites(writes);
  return {
    ok: result.errors.length === 0,
    approvalId,
    decision,
    executionAllowed,
    externalExecutionAllowed: false,
    errors: result.errors
  };
}
