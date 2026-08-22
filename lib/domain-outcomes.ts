import { canonicalId } from './canonical-ids';
import { safeCanonicalUpsert } from './canonical-upsert';
import { linkJobToEngagement } from './engagements';

export interface DispatchCloseoutInput {
  jobId: string;
  engagementId?: string;
  siteId?: string;
  technicianId?: string;
  equipmentIds?: string[];
  problem?: string;
  resolution?: string;
  qaScore?: number;
  proofUrls?: string[];
  completedAt?: string;
  revenueCents?: number;
  source?: string;
}

export async function recordDispatchCloseout(input: DispatchCloseoutInput): Promise<string> {
  const completedAt = input.completedAt ?? new Date().toISOString();
  if (input.engagementId) await linkJobToEngagement(input.engagementId, input.jobId, input.source ?? 'dispatch_closeout');
  await safeCanonicalUpsert('jobs', input.jobId, {
    status: 'completed',
    site_id: input.siteId ?? null,
    technician_id: input.technicianId ?? null,
    problem: input.problem ?? null,
    resolution: input.resolution ?? null,
    completed_at: completedAt,
    source: input.source ?? 'dispatch_closeout',
  });
  const proofId = canonicalId('proof', input.jobId, completedAt);
  await safeCanonicalUpsert('proof_of_work', proofId, {
    job_id: input.jobId,
    engagement_id: input.engagementId ?? null,
    site_id: input.siteId ?? null,
    technician_id: input.technicianId ?? null,
    equipment_ids: input.equipmentIds ?? [],
    problem: input.problem ?? null,
    resolution: input.resolution ?? null,
    qa_score: input.qaScore ?? null,
    proof_urls: input.proofUrls ?? [],
    completed_at: completedAt,
    source: input.source ?? 'dispatch_closeout',
  });
  if (typeof input.qaScore === 'number') {
    await safeCanonicalUpsert('qa_scores', canonicalId('qa', input.jobId, completedAt), {
      job_id: input.jobId,
      engagement_id: input.engagementId ?? null,
      score: input.qaScore,
      source: input.source ?? 'dispatch_closeout',
    });
  }
  if (input.revenueCents && input.revenueCents > 0) {
    await safeCanonicalUpsert('revenue_events', canonicalId('rev', input.jobId, 'completed'), {
      job_id: input.jobId,
      engagement_id: input.engagementId ?? null,
      event_type: 'revenue',
      amount_cents: input.revenueCents,
      currency: 'USD',
      source: input.source ?? 'dispatch_closeout',
    });
  }
  return proofId;
}

export interface AutoWorksOutcomeInput {
  organizationId?: string;
  contactId?: string;
  engagementId: string;
  jobId: string;
  vin: string;
  vehicleId?: string;
  intakePhotos?: string[];
  diagnosis?: string;
  repair?: string;
  partsCostCents?: number;
  laborCostCents?: number;
  chargedCents?: number;
  paymentStatus?: string;
  completedAt?: string;
}

export async function recordAutoWorksOutcome(input: AutoWorksOutcomeInput): Promise<{ vehicleId: string; proofId: string }> {
  const vehicleId = input.vehicleId ?? canonicalId('vehicle', input.vin.toUpperCase());
  const completedAt = input.completedAt ?? new Date().toISOString();
  await safeCanonicalUpsert('vehicles', vehicleId, {
    organization_id: input.organizationId ?? null,
    contact_id: input.contactId ?? null,
    vin: input.vin.toUpperCase(),
    source: 'autoworks',
  });
  await safeCanonicalUpsert('jobs', input.jobId, {
    engagement_id: input.engagementId,
    vehicle_id: vehicleId,
    status: 'completed',
    diagnosis: input.diagnosis ?? null,
    repair: input.repair ?? null,
    completed_at: completedAt,
    expected_cost_cents: Number(input.partsCostCents ?? 0) + Number(input.laborCostCents ?? 0),
    source: 'autoworks',
  });
  await linkJobToEngagement(input.engagementId, input.jobId, 'autoworks');
  const proofId = canonicalId('proof', input.jobId, 'autoworks');
  await safeCanonicalUpsert('proof_of_work', proofId, {
    job_id: input.jobId,
    engagement_id: input.engagementId,
    vehicle_id: vehicleId,
    intake_photos: input.intakePhotos ?? [],
    diagnosis: input.diagnosis ?? null,
    repair: input.repair ?? null,
    completed_at: completedAt,
    source: 'autoworks',
  });
  if (input.chargedCents && input.chargedCents > 0) {
    await safeCanonicalUpsert('revenue_events', canonicalId('rev', input.jobId, input.paymentStatus ?? 'earned'), {
      engagement_id: input.engagementId,
      job_id: input.jobId,
      vehicle_id: vehicleId,
      event_type: input.paymentStatus === 'paid' ? 'paid' : 'revenue',
      amount_cents: input.chargedCents,
      cost_cents: Number(input.partsCostCents ?? 0) + Number(input.laborCostCents ?? 0),
      contribution_cents: input.chargedCents - Number(input.partsCostCents ?? 0) - Number(input.laborCostCents ?? 0),
      source: 'autoworks',
    });
  }
  return { vehicleId, proofId };
}

export interface HaulingOutcomeInput {
  engagementId: string;
  jobId: string;
  quotedCents: number;
  acceptedCents?: number;
  predictedVolumeCuYd?: number;
  actualVolumeCuYd?: number;
  laborCostCents?: number;
  disposalCostCents?: number;
  recoveryValueCents?: number;
  mileageCostCents?: number;
  completedAt?: string;
}

export async function recordHaulingOutcome(input: HaulingOutcomeInput): Promise<Record<string, unknown>> {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const acceptedCents = input.acceptedCents ?? input.quotedCents;
  const costs = Number(input.laborCostCents ?? 0) + Number(input.disposalCostCents ?? 0) + Number(input.mileageCostCents ?? 0);
  const recovery = Number(input.recoveryValueCents ?? 0);
  const grossMarginCents = acceptedCents + recovery - costs;
  const predicted = Number(input.predictedVolumeCuYd ?? 0);
  const actual = Number(input.actualVolumeCuYd ?? 0);
  const modelErrorPct = actual > 0 ? Math.abs(predicted - actual) / actual : 0;

  await linkJobToEngagement(input.engagementId, input.jobId, 'hauling');
  const id = canonicalId('haulout', input.jobId, completedAt);
  const record = await safeCanonicalUpsert('hauling_outcomes', id, {
    engagement_id: input.engagementId,
    job_id: input.jobId,
    quoted_cents: input.quotedCents,
    accepted_cents: acceptedCents,
    predicted_volume_cu_yd: predicted,
    actual_volume_cu_yd: actual,
    labor_cost_cents: input.laborCostCents ?? 0,
    disposal_cost_cents: input.disposalCostCents ?? 0,
    recovery_value_cents: recovery,
    mileage_cost_cents: input.mileageCostCents ?? 0,
    gross_margin_cents: grossMarginCents,
    model_error_pct: modelErrorPct,
    completed_at: completedAt,
    source: 'hauling',
  });
  await safeCanonicalUpsert('revenue_events', canonicalId('rev', input.jobId, 'hauling'), {
    engagement_id: input.engagementId,
    job_id: input.jobId,
    event_type: 'revenue',
    amount_cents: acceptedCents,
    contribution_cents: grossMarginCents,
    source: 'hauling',
  });
  await safeCanonicalUpsert('ai_feedback', canonicalId('aifb', input.jobId, 'hauling_margin'), {
    engagement_id: input.engagementId,
    job_id: input.jobId,
    feedback_type: 'hauling_economic_outcome',
    model_error_pct: modelErrorPct,
    gross_margin_cents: grossMarginCents,
    source: 'hauling',
  });
  return record;
}
