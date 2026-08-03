import { createHash } from 'node:crypto';
import { findRecordBy, getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export type PipelineAction = 'review' | 'pass' | 'reply' | 'assign' | 'quote' | 'schedule' | 'prove' | 'invoice' | 'payment' | 'repeat';
export type PipelineStage = 'new' | 'qualified' | 'proposal' | 'under_review' | 'reply_drafted' | 'approved' | 'dispatched' | 'proof_recorded' | 'invoiced' | 'paid' | 'repeat_customer' | 'discarded';

export interface PipelineActionResult {
  ok: boolean;
  action: PipelineAction;
  opportunityId: string;
  stage: PipelineStage;
  persistedExternally: false;
  approvalRequired: boolean;
  message: string;
  nextLocalState: string;
  newRecordIds: string[];
}

function hashId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function timestamp(): string {
  return new Date().toISOString();
}

function auditWrite(actor: string, action: string, targetTable: string, targetId: string, reason: string): DatabaseReadyWrite {
  const id = hashId('audit', `${actor}:${action}:${targetId}:${timestamp()}`);
  return {
    table: 'audit_logs',
    id,
    action: 'insert',
    record: {
      id,
      actor,
      action: `pipeline_${action}`,
      target_table: targetTable,
      target_id: targetId,
      risk_level: 'medium',
      allowed: 1,
      reason,
      created_at: timestamp()
    }
  };
}

function reviewWrite(action: PipelineAction, opportunityId: string, decision: string): DatabaseReadyWrite {
  const id = hashId('review', `${opportunityId}:${action}:${timestamp()}`);
  return {
    table: 'reviews',
    id,
    action: 'insert',
    record: {
      id,
      target_table: 'opportunities',
      target_id: opportunityId,
      action,
      decision,
      persisted_externally: 0,
      approval_required: ['reply', 'assign', 'quote', 'schedule', 'invoice', 'payment'].includes(action) ? 1 : 0,
      created_at: timestamp()
    }
  };
}

function nextActionForStage(stage: PipelineStage): string {
  switch (stage) {
    case 'new': return 'Review, pass, reply, quote, schedule, prove, invoice, payment, or mark repeat.';
    case 'qualified': return 'Quote or schedule next step.';
    case 'proposal': return 'Await owner review/approval of quote.';
    case 'under_review': return 'Approve, discard, or request reply.';
    case 'reply_drafted': return 'Send reply draft or proceed to quote.';
    case 'approved': return 'Schedule dispatch or generate invoice.';
    case 'dispatched': return 'Record proof of completion.';
    case 'proof_recorded': return 'Generate invoice.';
    case 'invoiced': return 'Record payment.';
    case 'paid': return 'Mark repeat customer or close.';
    case 'repeat_customer': return 'Schedule follow-up service.';
    case 'discarded': return 'No further action.';
    default: return 'Review next action.';
  }
}

export async function applyPipelineAction(opportunityId: string, action: PipelineAction, actor = 'revenue_command_pipeline'): Promise<PipelineActionResult> {
  const opportunity = getRecord('opportunities', opportunityId);
  if (!opportunity) {
    return { ok: false, action, opportunityId, stage: 'new', persistedExternally: false, approvalRequired: false, message: 'Opportunity not found in owned database.', nextLocalState: 'new', newRecordIds: [] };
  }

  const now = timestamp();
  const lead = getRecord('leads', String(opportunity.lead_id || ''));
  const contactId = lead ? String(lead.contact_id || '') : '';
  const organizationId = lead ? String(lead.organization_id || '') : '';

  const writes: DatabaseReadyWrite[] = [];
  const newRecordIds: string[] = [];
  const updatedOpportunity: Record<string, unknown> = { ...opportunity, updated_at: now };
  const baseAuditReason = `Pipeline action '${action}' applied to opportunity ${opportunityId} by ${actor}. No external send, deploy, payment, or credential action executed.`;

  let stage: PipelineStage = 'new';

  switch (action) {
    case 'review': {
      stage = 'under_review';
      updatedOpportunity.next_action = nextActionForStage(stage);
      writes.push(reviewWrite(action, opportunityId, 'reviewed'));
      break;
    }
    case 'pass': {
      stage = 'discarded';
      updatedOpportunity.next_action = nextActionForStage(stage);
      writes.push(reviewWrite(action, opportunityId, 'passed'));
      break;
    }
    case 'reply': {
      stage = 'reply_drafted';
      updatedOpportunity.next_action = nextActionForStage(stage);
      const conversationId = hashId('conversation', `${opportunityId}:reply:${now}`);
      writes.push({
        table: 'conversations',
        id: conversationId,
        action: 'insert',
        record: {
          id: conversationId,
          lead_id: opportunity.lead_id,
          contact_id: contactId,
          channel: 'reply_draft',
          transcript: `Draft reply prepared for opportunity ${opportunityId}.`,
          summary: 'Reply draft staged locally',
          created_at: now,
          updated_at: now
        }
      });
      newRecordIds.push(conversationId);
      writes.push(reviewWrite(action, opportunityId, 'reply_drafted'));
      break;
    }
    case 'assign': {
      stage = 'approved';
      updatedOpportunity.next_action = nextActionForStage(stage);
      writes.push(reviewWrite(action, opportunityId, 'assigned'));
      break;
    }
    case 'quote': {
      stage = 'proposal';
      const quoteId = hashId('quote', `${opportunityId}:${now}`);
      const quoteAmount = Number(updatedOpportunity.estimated_value_cents || 0);
      updatedOpportunity.next_action = nextActionForStage(stage);
      writes.push({
        table: 'quotes',
        id: quoteId,
        action: 'insert',
        record: {
          id: quoteId,
          opportunity_id: opportunityId,
          contact_id: contactId,
          quote_amount_cents: quoteAmount,
          quote_status: 'draft',
          created_at: now,
          updated_at: now
        }
      });
      newRecordIds.push(quoteId);
      writes.push(reviewWrite(action, opportunityId, 'quoted'));
      break;
    }
    case 'schedule': {
      stage = 'dispatched';
      updatedOpportunity.next_action = nextActionForStage(stage);
      const dispatchId = hashId('dispatch', `${opportunityId}:${now}`);
      const jobId = hashId('job', `${opportunityId}:${now}`);
      const existingJob = findRecordBy('jobs', 'opportunity_id', opportunityId);
      const existingDispatch = findRecordBy('dispatches', 'opportunity_id', opportunityId);
      if (!existingJob) {
        writes.push({
          table: 'jobs',
          id: jobId,
          action: 'insert',
          record: {
            id: jobId,
            opportunity_id: opportunityId,
            job_type: 'dispatch',
            site_address: updatedOpportunity.location || null,
            status: 'scheduled',
            created_at: now,
            updated_at: now
          }
        });
        newRecordIds.push(jobId);
      }
      if (!existingDispatch) {
        writes.push({
          table: 'dispatches',
          id: dispatchId,
          action: 'insert',
          record: {
            id: dispatchId,
            job_id: existingJob ? String(existingJob.id) : jobId,
            opportunity_id: opportunityId,
            dispatch_status: 'scheduled',
            skill_match_score: 0,
            route_fit_score: 0,
            created_at: now,
            updated_at: now
          }
        });
        newRecordIds.push(dispatchId);
      }
      writes.push(reviewWrite(action, opportunityId, 'scheduled'));
      break;
    }
    case 'prove': {
      stage = 'proof_recorded';
      updatedOpportunity.next_action = nextActionForStage(stage);
      const proofId = hashId('proof', `${opportunityId}:prove:${now}`);
      writes.push({
        table: 'proof_of_work',
        id: proofId,
        action: 'insert',
        record: {
          id: proofId,
          opportunity_id: opportunityId,
          module: updatedOpportunity.lane || 'general',
          proof_type: 'completion_record',
          evidence_json: JSON.stringify([{ stage: 'proof_recorded', by: actor, at: now }]),
          outcome_summary: 'Completion proof recorded locally. External actions remain blocked.',
          reusable_product_candidate: 1,
          created_at: now,
          updated_at: now
        }
      });
      newRecordIds.push(proofId);
      writes.push(reviewWrite(action, opportunityId, 'proved'));
      break;
    }
    case 'invoice': {
      stage = 'invoiced';
      const invoiceId = hashId('invoice', `${opportunityId}:${now}`);
      const invoiceAmount = Number(updatedOpportunity.estimated_value_cents || 0);
      updatedOpportunity.next_action = nextActionForStage(stage);
      writes.push({
        table: 'invoices',
        id: invoiceId,
        action: 'insert',
        record: {
          id: invoiceId,
          opportunity_id: opportunityId,
          contact_id: contactId,
          invoice_amount_cents: invoiceAmount,
          invoice_status: 'issued',
          issued_at: now,
          created_at: now,
          updated_at: now
        }
      });
      newRecordIds.push(invoiceId);
      writes.push(reviewWrite(action, opportunityId, 'invoiced'));
      break;
    }
    case 'payment': {
      stage = 'paid';
      const invoice = findRecordBy('invoices', 'opportunity_id', opportunityId);
      const paymentId = hashId('payment', `${opportunityId}:${now}`);
      const paymentAmount = invoice ? Number(invoice.invoice_amount_cents || 0) : Number(updatedOpportunity.estimated_value_cents || 0);
      updatedOpportunity.next_action = nextActionForStage(stage);
      writes.push({
        table: 'payments',
        id: paymentId,
        action: 'insert',
        record: {
          id: paymentId,
          invoice_id: invoice ? String(invoice.id) : null,
          opportunity_id: opportunityId,
          contact_id: contactId,
          payment_amount_cents: paymentAmount,
          payment_method: 'pending',
          payment_status: 'completed',
          created_at: now,
          updated_at: now
        }
      });
      newRecordIds.push(paymentId);
      if (invoice) {
        const updatedInvoice = { ...invoice, invoice_status: 'paid', paid_at: now, updated_at: now };
        writes.push({ table: 'invoices', id: String(invoice.id), action: 'insert', record: updatedInvoice });
      }
      writes.push(reviewWrite(action, opportunityId, 'paid'));
      break;
    }
    case 'repeat': {
      stage = 'repeat_customer';
      const repeatId = hashId('repeat', `${opportunityId}:${now}`);
      updatedOpportunity.next_action = nextActionForStage(stage);
      writes.push({
        table: 'repeating_customers',
        id: repeatId,
        action: 'insert',
        record: {
          id: repeatId,
          organization_id: organizationId,
          contact_id: contactId,
          opportunity_id: opportunityId,
          repeat_score: 80,
          next_service_due_date: '2026-09-03',
          created_at: now,
          updated_at: now
        }
      });
      newRecordIds.push(repeatId);
      writes.push(reviewWrite(action, opportunityId, 'repeat_customer'));
      break;
    }
    default: {
      stage = 'new';
    }
  }

  updatedOpportunity.status = stage;
  writes.push({ table: 'opportunities', id: opportunityId, action: 'insert', record: updatedOpportunity });
  writes.push(auditWrite(actor, action, 'opportunities', opportunityId, baseAuditReason));

  const { errors } = await persistDatabaseReadyWrites(writes);
  const message = errors.length ? `Pipeline action staged with errors: ${errors.join(', ')}` : `Pipeline action '${action}' applied locally. Opportunity status is now '${stage}'. No external send, payment, or deployment was executed.`;

  return {
    ok: errors.length === 0,
    action,
    opportunityId,
    stage,
    persistedExternally: false,
    approvalRequired: ['reply', 'assign', 'quote', 'schedule', 'invoice', 'payment'].includes(action),
    message,
    nextLocalState: stage,
    newRecordIds
  };
}
