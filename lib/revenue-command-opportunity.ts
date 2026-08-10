import { createHash } from 'node:crypto';
import { findRecordBy, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface OpportunitySignalInput {
  sourceSystem: string;
  sourceRecordId: string;
  sourceType: string;
  sourceUri?: string;
  title: string;
  lane: string;
  revenueLaneSupported?: string;
  estimatedValueCents?: number;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  blocker?: string;
  nextAction: string;
  recommendedFollowUpDate?: string;
  revenueImpactScore?: number;
  recurringRevenueScore?: number;
  dataNetworkScore?: number;
  dependencyScore?: number;
  riskReductionScore?: number;
  proofSpeedScore?: number;
  reusableProductScore?: number;
  evidence?: Record<string, unknown>;
  discoveredAt?: string;
}

export interface OpportunitySignalResult {
  ok: boolean;
  duplicate: boolean;
  opportunityId: string;
  sourceId: string;
  scoreId: string;
  compositeScore: number;
  errors: string[];
}

const SCORE_VERSION = '2026-08-owned-core-v1';

function id(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

function boundedScore(value: number | undefined, fallback = 0): number {
  const numeric = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

export function calculateOpportunityComposite(input: OpportunitySignalInput): number {
  const revenueImpact = boundedScore(input.revenueImpactScore, input.estimatedValueCents && input.estimatedValueCents >= 50000 ? 90 : 50);
  const recurring = boundedScore(input.recurringRevenueScore);
  const dataNetwork = boundedScore(input.dataNetworkScore);
  const dependency = boundedScore(input.dependencyScore);
  const riskReduction = boundedScore(input.riskReductionScore);
  const proofSpeed = boundedScore(input.proofSpeedScore);
  const reusable = boundedScore(input.reusableProductScore);

  return Math.round(
    revenueImpact * 0.25 +
    recurring * 0.20 +
    dataNetwork * 0.15 +
    dependency * 0.10 +
    riskReduction * 0.10 +
    proofSpeed * 0.10 +
    reusable * 0.10
  );
}

export async function ingestOpportunitySignal(input: OpportunitySignalInput): Promise<OpportunitySignalResult> {
  const now = input.discoveredAt || new Date().toISOString();
  const sourceKey = `${input.sourceSystem.trim().toLowerCase()}:${input.sourceRecordId.trim().toLowerCase()}`;
  const existingSource = findRecordBy('opportunity_sources', 'source_key', sourceKey);
  if (existingSource) {
    return {
      ok: true,
      duplicate: true,
      opportunityId: String(existingSource.opportunity_id || ''),
      sourceId: String(existingSource.id || ''),
      scoreId: String(existingSource.score_id || ''),
      compositeScore: Number(existingSource.composite_score || 0),
      errors: []
    };
  }

  const opportunityId = id('opportunity', sourceKey);
  const sourceId = id('source', sourceKey);
  const scoreId = id('score', `${opportunityId}:${SCORE_VERSION}`);
  const auditId = id('audit', `${sourceId}:${now}`);
  const compositeScore = calculateOpportunityComposite(input);
  const priority = input.priority || (compositeScore >= 85 ? 'P0' : compositeScore >= 70 ? 'P1' : compositeScore >= 50 ? 'P2' : 'P3');
  const rawEvidence = input.evidence || {};
  const writes: DatabaseReadyWrite[] = [
    {
      table: 'opportunities',
      id: opportunityId,
      action: 'insert',
      record: {
        id: opportunityId,
        lead_id: null,
        lane: input.lane,
        revenue_lane_supported: input.revenueLaneSupported || input.lane,
        title: input.title,
        estimated_value_cents: Math.max(0, Math.trunc(input.estimatedValueCents || 0)),
        priority,
        score: compositeScore,
        blocker: input.blocker || '',
        next_action: input.nextAction,
        status: 'new',
        recommended_follow_up_date: input.recommendedFollowUpDate || null,
        source_system: input.sourceSystem,
        source_record_id: input.sourceRecordId,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'opportunity_scores',
      id: scoreId,
      action: 'insert',
      record: {
        id: scoreId,
        opportunity_id: opportunityId,
        score_version: SCORE_VERSION,
        revenue_impact_score: boundedScore(input.revenueImpactScore, input.estimatedValueCents && input.estimatedValueCents >= 50000 ? 90 : 50),
        recurring_revenue_score: boundedScore(input.recurringRevenueScore),
        data_network_score: boundedScore(input.dataNetworkScore),
        dependency_score: boundedScore(input.dependencyScore),
        risk_reduction_score: boundedScore(input.riskReductionScore),
        proof_speed_score: boundedScore(input.proofSpeedScore),
        reusable_product_score: boundedScore(input.reusableProductScore),
        composite_score: compositeScore,
        rationale: rawEvidence,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'opportunity_sources',
      id: sourceId,
      action: 'insert',
      record: {
        id: sourceId,
        opportunity_id: opportunityId,
        score_id: scoreId,
        source_key: sourceKey,
        source_type: input.sourceType,
        source_system: input.sourceSystem,
        source_record_id: input.sourceRecordId,
        source_uri: input.sourceUri || null,
        raw_hash: id('sha', JSON.stringify(rawEvidence)).replace('sha_', ''),
        composite_score: compositeScore,
        discovered_at: now,
        created_at: now,
        updated_at: now
      }
    },
    {
      table: 'audit_logs',
      id: auditId,
      action: 'insert',
      record: {
        id: auditId,
        actor: 'opportunity_ingestion',
        action: 'ingest_opportunity_signal',
        target_table: 'opportunities',
        target_id: opportunityId,
        risk_level: 'low',
        allowed: 1,
        reason: `Normalized ${input.sourceSystem} signal ${input.sourceRecordId} into canonical opportunity model.`,
        created_at: now,
        updated_at: now
      }
    }
  ];

  const result = await persistDatabaseReadyWrites(writes);
  return {
    ok: result.errors.length === 0,
    duplicate: false,
    opportunityId,
    sourceId,
    scoreId,
    compositeScore,
    errors: result.errors
  };
}
