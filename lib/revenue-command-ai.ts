import { createHash } from 'node:crypto';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface AiOperationInput {
  contactId: string;
  leadId: string;
  opportunityId: string;
  intakeId: string;
  source: string;
  submittedAt: string;
  summary: string;
  transcript?: string;
  goal?: string;
  confidence?: number;
  channel?: string;
}

function hashId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

export function buildAiOperationWrites(input: AiOperationInput): DatabaseReadyWrite[] {
  const { contactId, leadId, opportunityId, intakeId, source, submittedAt, summary, transcript, goal, confidence, channel } = input;
  const writes: DatabaseReadyWrite[] = [];

  const conversationId = hashId('ai_conversation', `${intakeId}:${submittedAt}`);
  if (transcript || summary) {
    writes.push({
      table: 'ai_conversations',
      id: conversationId,
      action: 'insert',
      record: {
        id: conversationId,
        lead_id: leadId,
        contact_id: contactId,
        opportunity_id: opportunityId,
        channel: channel || 'intake',
        transcript: transcript || summary,
        summary,
        created_at: submittedAt,
        updated_at: submittedAt
      }
    });
  }

  const memoryId = hashId('ai_memory', `${intakeId}:${submittedAt}`);
  writes.push({
    table: 'ai_memory',
    id: memoryId,
    action: 'insert',
    record: {
      id: memoryId,
      contact_id: contactId,
      lead_id: leadId,
      opportunity_id: opportunityId,
      source,
      observation: summary,
      confidence: confidence ?? 0,
      created_at: submittedAt,
      updated_at: submittedAt
    }
  });

  const taskId = hashId('ai_task', `${intakeId}:${submittedAt}`);
  writes.push({
    table: 'ai_tasks',
    id: taskId,
    action: 'insert',
    record: {
      id: taskId,
      contact_id: contactId,
      lead_id: leadId,
      opportunity_id: opportunityId,
      task_type: 'review_and_qualify',
      status: 'open',
      priority: 'P1',
      description: `Review and qualify ${source} intake: ${summary.slice(0, 200)}`,
      created_at: submittedAt,
      updated_at: submittedAt
    }
  });

  if (goal) {
    const goalId = hashId('ai_goal', `${intakeId}:${submittedAt}`);
    writes.push({
      table: 'ai_goals',
      id: goalId,
      action: 'insert',
      record: {
        id: goalId,
        contact_id: contactId,
        lead_id: leadId,
        opportunity_id: opportunityId,
        goal,
        status: 'active',
        progress_percent: 0,
        created_at: submittedAt,
        updated_at: submittedAt
      }
    });
  }

  const feedbackId = hashId('ai_feedback', `${intakeId}:${submittedAt}`);
  writes.push({
    table: 'ai_feedback',
    id: feedbackId,
    action: 'insert',
    record: {
      id: feedbackId,
      contact_id: contactId,
      lead_id: leadId,
      opportunity_id: opportunityId,
      feedback_type: 'intake_confidence',
      feedback_text: `Initial confidence ${confidence ?? 0} for ${source}`,
      outcome: 'pending',
      created_at: submittedAt,
      updated_at: submittedAt
    }
  });

  return writes;
}
