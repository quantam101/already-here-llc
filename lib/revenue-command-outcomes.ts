import { createHash } from 'node:crypto';
import { getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export type OutcomeType = 'accepted' | 'rejected' | 'completed' | 'failed' | 'revenue';
export type VerificationStatus = 'unverified' | 'verified';

export interface AiOutcomeInput {
  aiActionId: string;
  opportunityId?: string;
  outcomeType: OutcomeType;
  summary: string;
  realizedRevenueCents?: number;
  realizedCostCents?: number;
  verificationStatus?: VerificationStatus;
  evidence?: Array<Record<string, unknown>>;
  actor?: string;
  occurredAt?: string;
}

export interface AiOutcomeResult {
  ok: boolean;
  outcomeId: string;
  feedbackId: string;
  revenueEventId?: string;
  contributionMarginCents: number;
  verificationStatus: VerificationStatus;
  errors: string[];
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

export async function recordAiOutcome(input: AiOutcomeInput): Promise<AiOutcomeResult> {
  const action = getRecord('ai_actions', input.aiActionId);
  if (!action) {
    return {
      ok: false,
      outcomeId: '',
      feedbackId: '',
      contributionMarginCents: 0,
      verificationStatus: input.verificationStatus || 'unverified',
      errors: [`AI action not found: ${input.aiActionId}`]
    };
  }

  const occurredAt = input.occurredAt || new Date().toISOString();
  const verificationStatus = input.verificationStatus || 'unverified';
  const opportunityId = input.opportunityId || String(action.target_id || '');
  const revenue = Math.max(0, Math.trunc(input.realizedRevenueCents || 0));
  const cost = Math.max(0, Math.trunc(input.realizedCostCents || 0));
  const margin = revenue - cost;
  const outcomeId = stableId('outcome', `${input.aiActionId}:${occurredAt}:${input.outcomeType}`);
  const feedbackId = stableId('feedback', `${outcomeId}:feedback`);
  const writes: DatabaseReadyWrite[] = [
    {
      table: 'outcomes',
      id: outcomeId,
      action: 'insert',
      record: {
        id: outcomeId,
        ai_action_id: input.aiActionId,
        opportunity_id: opportunityId || null,
        outcome_type: input.outcomeType,
        summary: input.summary,
        realized_revenue_cents: revenue,
        realized_cost_cents: cost,
        contribution_margin_cents: margin,
        verification_status: verificationStatus,
        evidence: input.evidence || [],
        occurred_at: occurredAt,
        created_at: occurredAt,
        updated_at: occurredAt
      }
    },
    {
      table: 'ai_feedback',
      id: feedbackId,
      action: 'insert',
      record: {
        id: feedbackId,
        opportunity_id: opportunityId || null,
        ai_action_id: input.aiActionId,
        feedback_type: 'business_outcome',
        feedback_text: input.summary,
        outcome: input.outcomeType,
        verification_status: verificationStatus,
        realized_revenue_cents: revenue,
        contribution_margin_cents: margin,
        created_at: occurredAt,
        updated_at: occurredAt
      }
    },
    {
      table: 'ai_actions',
      id: input.aiActionId,
      action: 'insert',
      record: {
        ...action,
        outcome_id: outcomeId,
        outcome_type: input.outcomeType,
        outcome_verification_status: verificationStatus,
        updated_at: occurredAt
      }
    }
  ];

  let revenueEventId: string | undefined;
  if (verificationStatus === 'verified' && revenue > 0) {
    revenueEventId = stableId('revenue_ai', `${outcomeId}:${revenue}`);
    writes.push({
      table: 'revenue_events',
      id: revenueEventId,
      action: 'insert',
      record: {
        id: revenueEventId,
        ai_action_id: input.aiActionId,
        outcome_id: outcomeId,
        opportunity_id: opportunityId || null,
        event_type: 'verified_ai_attributed_revenue',
        amount_cents: revenue,
        cost_cents: cost,
        contribution_margin_cents: margin,
        currency: 'USD',
        verification_status: verificationStatus,
        source: 'ai_outcome',
        created_at: occurredAt,
        updated_at: occurredAt
      }
    });
  }

  const actor = input.actor || 'revenue_command_outcomes';
  const auditId = stableId('audit', `${outcomeId}:${actor}`);
  writes.push({
    table: 'audit_logs',
    id: auditId,
    action: 'insert',
    record: {
      id: auditId,
      actor,
      action: 'record_ai_business_outcome',
      target_table: 'ai_actions',
      target_id: input.aiActionId,
      risk_level: revenueEventId ? 'high' : 'medium',
      allowed: 1,
      reason: revenueEventId
        ? 'Verified business outcome linked to AI action and attributed revenue event.'
        : 'Business outcome linked to AI action without creating a verified revenue event.',
      created_at: occurredAt,
      updated_at: occurredAt
    }
  });

  const result = await persistDatabaseReadyWrites(writes);
  return {
    ok: result.errors.length === 0,
    outcomeId,
    feedbackId,
    revenueEventId,
    contributionMarginCents: margin,
    verificationStatus,
    errors: result.errors
  };
}
