import { createHash } from 'node:crypto';
import { getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface AhfosJobSnapshot {
  jobId: string;
  opportunityId?: string;
  customerId?: string;
  technicianId?: string;
  status: string;
  serviceType?: string;
  siteAddress?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  closeoutNotes?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  signatureRef?: string;
  checklistComplete?: boolean;
  qaScore?: number;
  qaMissingItems?: string[];
  invoiceAmountCents?: number;
  source?: string;
  observedAt?: string;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

export async function ingestAhfosJobSnapshot(snapshot: AhfosJobSnapshot): Promise<{ ok: boolean; jobId: string; opportunityId: string; proofId: string; inserted: number; errors: string[] }> {
  const observedAt = snapshot.observedAt || new Date().toISOString();
  const jobId = snapshot.jobId;
  const opportunityId = snapshot.opportunityId || stableId('opp', `ahfos:${jobId}`);
  const proofId = stableId('proof', `ahfos:${jobId}:${snapshot.status}`);
  const completed = ['completed', 'closed', 'invoiced', 'paid'].includes(snapshot.status.toLowerCase());
  const writes: DatabaseReadyWrite[] = [];

  if (!getRecord('opportunities', opportunityId)) {
    writes.push({
      table: 'opportunities', id: opportunityId, action: 'insert', record: {
        id: opportunityId,
        lead_id: null,
        source_record_id: jobId,
        source_customer_id: snapshot.customerId || null,
        lane: 'Dispatch',
        revenue_lane_supported: 'Field Services',
        title: snapshot.serviceType || `AHFOS field job ${jobId}`,
        summary: snapshot.closeoutNotes || 'AHFOS field job reconciled into Revenue Command.',
        estimated_value_cents: Math.max(0, Math.trunc(snapshot.invoiceAmountCents || 0)),
        priority: 'P1',
        score: 70,
        blocker: 'External actions remain approval-gated.',
        next_action: completed ? 'Review closeout, invoice/payment state, and repeat-service potential.' : 'Review dispatch and technician assignment.',
        status: completed ? 'proof_recorded' : 'dispatched',
        source_system: 'AHFOS',
        created_at: observedAt,
        updated_at: observedAt
      }
    });
  }

  writes.push(
    {
      table: 'jobs', id: jobId, action: 'insert', record: {
        id: jobId,
        opportunity_id: opportunityId,
        customer_id: snapshot.customerId || null,
        job_type: snapshot.serviceType || 'ahfos_field_job',
        site_address: snapshot.siteAddress || null,
        scheduled_start: snapshot.scheduledStart || null,
        scheduled_end: snapshot.scheduledEnd || null,
        status: snapshot.status,
        closeout_notes: snapshot.closeoutNotes || null,
        source_system: 'AHFOS',
        source: snapshot.source || 'ahfos_adapter',
        created_at: observedAt,
        updated_at: observedAt
      }
    },
    {
      table: 'dispatches', id: stableId('dispatch', jobId), action: 'insert', record: {
        id: stableId('dispatch', jobId),
        job_id: jobId,
        opportunity_id: opportunityId,
        technician_id: snapshot.technicianId || null,
        dispatch_status: snapshot.status,
        skill_match_score: 0,
        route_fit_score: 0,
        source_system: 'AHFOS',
        created_at: observedAt,
        updated_at: observedAt
      }
    },
    {
      table: 'proof_of_work', id: proofId, action: 'insert', record: {
        id: proofId,
        opportunity_id: opportunityId,
        module: 'AHFOS',
        proof_type: completed ? 'field_closeout' : 'field_job_snapshot',
        evidence_json: JSON.stringify({
          beforePhotos: snapshot.beforePhotos || [],
          afterPhotos: snapshot.afterPhotos || [],
          signatureRef: snapshot.signatureRef || null,
          checklistComplete: Boolean(snapshot.checklistComplete),
          qaScore: snapshot.qaScore ?? null,
          qaMissingItems: snapshot.qaMissingItems || []
        }),
        outcome_summary: completed ? 'AHFOS closeout evidence reconciled into the canonical Revenue Command graph.' : 'AHFOS field job state reconciled into the canonical Revenue Command graph.',
        reusable_product_candidate: 1,
        created_at: observedAt,
        updated_at: observedAt
      }
    },
    {
      table: 'analytics_events', id: stableId('analytics', `ahfos:${jobId}:${snapshot.status}`), action: 'insert', record: {
        id: stableId('analytics', `ahfos:${jobId}:${snapshot.status}`),
        source: snapshot.source || 'ahfos_adapter',
        module: 'AHFOS',
        action: completed ? 'field_job_completed' : 'field_job_reconciled',
        target_table: 'jobs',
        target_id: jobId,
        conversion_value_cents: Math.max(0, Math.trunc(snapshot.invoiceAmountCents || 0)),
        created_at: observedAt
      }
    }
  );

  if (typeof snapshot.qaScore === 'number') {
    writes.push({
      table: 'outcomes', id: stableId('outcome', `ahfos:${jobId}:qa`), action: 'insert', record: {
        id: stableId('outcome', `ahfos:${jobId}:qa`),
        opportunity_id: opportunityId,
        source: 'AHFOS_QA',
        outcome_type: 'qa_score',
        success: snapshot.qaScore >= 80 ? 1 : 0,
        score: Math.max(0, Math.min(100, Math.round(snapshot.qaScore))),
        details_json: JSON.stringify({ missingItems: snapshot.qaMissingItems || [] }),
        created_at: observedAt,
        updated_at: observedAt
      }
    });
  }

  const result = await persistDatabaseReadyWrites(writes);
  return { ok: result.errors.length === 0, jobId, opportunityId, proofId, inserted: result.inserted, errors: result.errors };
}
