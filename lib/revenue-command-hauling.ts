import { createHash } from 'node:crypto';
import { getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface HaulingDetectedItem {
  label: string;
  count: number;
  volumeCubicFeet: number;
  resaleValueCents?: number;
  disposalCostCents?: number;
  confidence?: number;
}

export interface HaulingPricingPolicy {
  baseFeeCents: number;
  perCubicYardCents: number;
  laborHourlyCents: number;
  perMileCents: number;
  minimumQuoteCents: number;
  resaleCreditShareBps: number;
}

export interface HaulingPhotoQuoteInput {
  opportunityId: string;
  scanId: string;
  pickupAddress: string;
  dropoffAddress?: string;
  photoRefs: string[];
  items: HaulingDetectedItem[];
  estimatedMiles: number;
  estimatedLaborMinutes: number;
  policy?: Partial<HaulingPricingPolicy>;
  generatedAt?: string;
}

export interface HaulingPhotoQuoteResult {
  ok: boolean;
  quoteId?: string;
  haulingJobId?: string;
  proofId?: string;
  quoteAmountCents?: number;
  estimatedCostCents?: number;
  contributionMarginCents?: number;
  calculations?: Record<string, number>;
  errors: string[];
}

const DEFAULT_POLICY: HaulingPricingPolicy = {
  baseFeeCents: 7500,
  perCubicYardCents: 6000,
  laborHourlyCents: 6000,
  perMileCents: 125,
  minimumQuoteCents: 12500,
  resaleCreditShareBps: 2500
};

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

export function calculateHaulingQuote(input: Omit<HaulingPhotoQuoteInput, 'opportunityId' | 'scanId' | 'pickupAddress' | 'photoRefs' | 'generatedAt'>): {
  quoteAmountCents: number;
  estimatedCostCents: number;
  contributionMarginCents: number;
  calculations: Record<string, number>;
  policy: HaulingPricingPolicy;
} {
  const policy: HaulingPricingPolicy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const cubicFeet = input.items.reduce((sum, item) => sum + Math.max(0, item.volumeCubicFeet) * Math.max(0, Math.trunc(item.count)), 0);
  const cubicYards = cubicFeet / 27;
  const volumeCharge = Math.round(cubicYards * policy.perCubicYardCents);
  const laborCharge = Math.round(Math.max(0, input.estimatedLaborMinutes) / 60 * policy.laborHourlyCents);
  const mileageCharge = Math.round(Math.max(0, input.estimatedMiles) * policy.perMileCents);
  const disposalCost = input.items.reduce((sum, item) => sum + Math.max(0, Math.trunc(item.disposalCostCents || 0)) * Math.max(1, Math.trunc(item.count)), 0);
  const resaleValue = input.items.reduce((sum, item) => sum + Math.max(0, Math.trunc(item.resaleValueCents || 0)) * Math.max(1, Math.trunc(item.count)), 0);
  const resaleCredit = Math.round(resaleValue * policy.resaleCreditShareBps / 10_000);
  const rawQuote = policy.baseFeeCents + volumeCharge + laborCharge + mileageCharge + disposalCost - resaleCredit;
  const quoteAmountCents = Math.max(policy.minimumQuoteCents, rawQuote);
  const estimatedCostCents = disposalCost + Math.round(laborCharge * 0.5) + Math.round(mileageCharge * 0.6);
  return {
    quoteAmountCents,
    estimatedCostCents,
    contributionMarginCents: quoteAmountCents - estimatedCostCents,
    calculations: { cubicFeet: Number(cubicFeet.toFixed(2)), cubicYards: Number(cubicYards.toFixed(3)), volumeCharge, laborCharge, mileageCharge, disposalCost, resaleValue, resaleCredit },
    policy
  };
}

export async function createHaulingPhotoQuote(input: HaulingPhotoQuoteInput): Promise<HaulingPhotoQuoteResult> {
  const opportunity = getRecord('opportunities', input.opportunityId);
  if (!opportunity) return { ok: false, errors: [`Opportunity not found: ${input.opportunityId}`] };
  if (!input.photoRefs.length) return { ok: false, errors: ['At least one source photo is required for photo-to-quote proof.'] };
  if (!input.items.length) return { ok: false, errors: ['At least one detected or manually confirmed item is required.'] };
  const now = input.generatedAt || new Date().toISOString();
  const pricing = calculateHaulingQuote(input);
  const quoteId = stableId('quote', `${input.opportunityId}:${input.scanId}:hauling`);
  const haulingJobId = stableId('hauling', input.opportunityId);
  const proofId = stableId('proof', `${input.scanId}:${quoteId}`);
  const averageConfidence = input.items.length
    ? input.items.reduce((sum, item) => sum + Math.max(0, Math.min(1, Number(item.confidence ?? 1))), 0) / input.items.length
    : 0;
  const loadType = input.items.map((item) => `${Math.max(1, Math.trunc(item.count))}x ${item.label}`).join(', ');
  const writes: DatabaseReadyWrite[] = [
    {
      table: 'quotes', id: quoteId, action: 'insert', record: {
        id: quoteId,
        opportunity_id: input.opportunityId,
        contact_id: opportunity.contact_id || null,
        quote_amount_cents: pricing.quoteAmountCents,
        estimated_cost_cents: pricing.estimatedCostCents,
        contribution_margin_cents: pricing.contributionMarginCents,
        quote_status: 'draft_pending_owner_review',
        pricing_version: 'hauling-photo-v1',
        pricing_policy: pricing.policy,
        calculations: pricing.calculations,
        source_scan_id: input.scanId,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'hauling_jobs', id: haulingJobId, action: 'insert', record: {
        id: haulingJobId,
        opportunity_id: input.opportunityId,
        quote_id: quoteId,
        scan_id: input.scanId,
        pickup_address: input.pickupAddress,
        dropoff_address: input.dropoffAddress || null,
        load_type: loadType,
        detected_items: input.items,
        source_photos: input.photoRefs,
        average_detection_confidence: Number(averageConfidence.toFixed(4)),
        estimated_value_cents: pricing.quoteAmountCents,
        estimated_cost_cents: pricing.estimatedCostCents,
        contribution_margin_cents: pricing.contributionMarginCents,
        estimated_miles: Math.max(0, input.estimatedMiles),
        estimated_labor_minutes: Math.max(0, input.estimatedLaborMinutes),
        status: 'quote_draft_pending_review',
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'proof_of_work', id: proofId, action: 'insert', record: {
        id: proofId,
        opportunity_id: input.opportunityId,
        module: 'Hauling',
        proof_type: 'photo_to_quote',
        evidence: { scan_id: input.scanId, photo_refs: input.photoRefs, items: input.items, pricing: pricing.calculations, pricing_policy: pricing.policy },
        outcome_summary: `Photo-to-quote generated draft quote ${quoteId} for ${pricing.quoteAmountCents} cents; owner review required before customer delivery.`,
        reusable_product_candidate: 1,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'audit_logs', id: stableId('audit', `${proofId}:photo_quote`), action: 'insert', record: {
        id: stableId('audit', `${proofId}:photo_quote`),
        actor: 'hauling_photo_quote_agent',
        action: 'generate_local_quote_draft',
        target_table: 'quotes',
        target_id: quoteId,
        risk_level: 'medium',
        allowed: 1,
        reason: 'Deterministic quote draft generated from photo evidence. External quote delivery remains approval-gated.',
        created_at: now,
        updated_at: now
      }
    }
  ];
  const result = await persistDatabaseReadyWrites(writes);
  return {
    ok: result.errors.length === 0,
    quoteId,
    haulingJobId,
    proofId,
    quoteAmountCents: pricing.quoteAmountCents,
    estimatedCostCents: pricing.estimatedCostCents,
    contributionMarginCents: pricing.contributionMarginCents,
    calculations: pricing.calculations,
    errors: result.errors
  };
}
