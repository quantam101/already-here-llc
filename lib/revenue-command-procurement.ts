import { createHash } from 'node:crypto';
import { getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import { recordApprovalAction } from './revenue-command-approval';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface ProcurementTargetInput {
  opportunityId: string;
  organizationId?: string;
  solicitationId: string;
  targetType: 'RFI' | 'RFQ' | 'RFP' | 'bid' | 'vendor_registration' | 'grant' | 'commercial';
  portalUrl?: string;
  agencyOrBuyer: string;
  deadlineDate?: string;
  estimatedValueCents?: number;
  requiredCertifications?: string[];
  heldCertifications?: string[];
  requiredCapabilities?: string[];
  availableCapabilities?: string[];
  source?: string;
  observedAt?: string;
}

export interface ProcurementEvaluation {
  compliancePercent: number;
  capabilityPercent: number;
  deadlineScore: number;
  valueScore: number;
  compositeScore: number;
  eligible: boolean;
  missingCertifications: string[];
  missingCapabilities: string[];
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

function normalized(values: string[] = []): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function coverage(required: string[] = [], held: string[] = []): { percent: number; missing: string[] } {
  if (!required.length) return { percent: 100, missing: [] };
  const heldSet = normalized(held);
  const missing = required.filter((value) => !heldSet.has(value.trim().toLowerCase()));
  return { percent: Math.round((required.length - missing.length) / required.length * 100), missing };
}

export function evaluateProcurementTarget(input: ProcurementTargetInput, now = Date.now()): ProcurementEvaluation {
  const certs = coverage(input.requiredCertifications, input.heldCertifications);
  const capabilities = coverage(input.requiredCapabilities, input.availableCapabilities);
  let deadlineScore = 50;
  if (input.deadlineDate) {
    const deadline = Date.parse(`${input.deadlineDate}T23:59:59Z`);
    if (Number.isFinite(deadline)) {
      const days = (deadline - now) / 86_400_000;
      deadlineScore = days < 0 ? 0 : days <= 2 ? 100 : days <= 7 ? 90 : days <= 30 ? 75 : 60;
    }
  }
  const value = Math.max(0, input.estimatedValueCents || 0);
  const valueScore = value >= 500_000 ? 100 : value >= 100_000 ? 90 : value >= 50_000 ? 80 : value >= 10_000 ? 60 : 40;
  const compositeScore = Math.round(certs.percent * 0.30 + capabilities.percent * 0.30 + deadlineScore * 0.15 + valueScore * 0.25);
  return {
    compliancePercent: certs.percent,
    capabilityPercent: capabilities.percent,
    deadlineScore,
    valueScore,
    compositeScore,
    eligible: certs.missing.length === 0 && capabilities.missing.length === 0 && deadlineScore > 0,
    missingCertifications: certs.missing,
    missingCapabilities: capabilities.missing
  };
}

export async function createProcurementTarget(input: ProcurementTargetInput): Promise<{ ok: boolean; targetId: string; evaluation: ProcurementEvaluation; errors: string[] }> {
  const opportunity = getRecord('opportunities', input.opportunityId);
  if (!opportunity) return { ok: false, targetId: '', evaluation: evaluateProcurementTarget(input), errors: [`Opportunity not found: ${input.opportunityId}`] };
  const now = input.observedAt || new Date().toISOString();
  const targetId = stableId('procurement', `${input.solicitationId}:${input.agencyOrBuyer}`);
  const evaluation = evaluateProcurementTarget(input, Date.parse(now));
  const writes: DatabaseReadyWrite[] = [
    {
      table: 'procurement_targets', id: targetId, action: 'insert', record: {
        id: targetId,
        opportunity_id: input.opportunityId,
        organization_id: input.organizationId || opportunity.organization_id || null,
        solicitation_id: input.solicitationId,
        target_type: input.targetType,
        agency_or_buyer: input.agencyOrBuyer,
        portal_url: input.portalUrl || null,
        deadline_date: input.deadlineDate || null,
        estimated_value_cents: Math.max(0, Math.trunc(input.estimatedValueCents || 0)),
        required_certifications: input.requiredCertifications || [],
        held_certifications: input.heldCertifications || [],
        required_capabilities: input.requiredCapabilities || [],
        available_capabilities: input.availableCapabilities || [],
        compliance_status: evaluation.eligible ? 'eligible' : 'needs_review',
        compliance_percent: evaluation.compliancePercent,
        capability_percent: evaluation.capabilityPercent,
        composite_score: evaluation.compositeScore,
        missing_certifications: evaluation.missingCertifications,
        missing_capabilities: evaluation.missingCapabilities,
        submission_status: 'blocked_pending_owner_approval',
        source: input.source || 'procurement_intake',
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'proof_of_work', id: stableId('proof', `${targetId}:evaluation`), action: 'insert', record: {
        id: stableId('proof', `${targetId}:evaluation`),
        opportunity_id: input.opportunityId,
        module: 'Procurement',
        proof_type: 'eligibility_and_fit_evaluation',
        evidence: evaluation,
        outcome_summary: evaluation.eligible
          ? 'Procurement target passes currently supplied certification and capability checks; submission still requires owner approval.'
          : `Procurement target requires review before submission: ${[...evaluation.missingCertifications, ...evaluation.missingCapabilities].join(', ') || 'deadline or compliance issue'}.`,
        reusable_product_candidate: 1,
        created_at: now,
        updated_at: now
      }
    }
  ];
  const result = await persistDatabaseReadyWrites(writes);
  return { ok: result.errors.length === 0, targetId, evaluation, errors: result.errors };
}

export async function approveProcurementPreparation(targetId: string, actorId: string, note?: string): Promise<{ ok: boolean; targetId: string; approvalId?: string; status?: string; errors: string[] }> {
  const target = getRecord('procurement_targets', targetId);
  if (!target) return { ok: false, targetId, errors: [`Procurement target not found: ${targetId}`] };
  const approval = await recordApprovalAction({ targetTable: 'procurement_targets', targetId, action: 'approve', actorId, note, authorityScope: 'procurement_preparation' });
  if (!approval.ok) return { ok: false, targetId, approvalId: approval.approvalId, errors: approval.errors };
  const now = new Date().toISOString();
  const result = await persistDatabaseReadyWrites([{
    table: 'procurement_targets', id: targetId, action: 'insert', record: {
      ...target,
      submission_status: 'approved_for_preparation_not_submitted',
      approval_id: approval.approvalId,
      approved_by: actorId,
      approved_at: now,
      externally_submitted: 0,
      updated_at: now
    }
  }]);
  return { ok: result.errors.length === 0, targetId, approvalId: approval.approvalId, status: 'approved_for_preparation_not_submitted', errors: result.errors };
}
