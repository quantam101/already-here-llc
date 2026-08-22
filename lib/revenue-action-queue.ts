import { getCanonicalStore } from './canonical-store';

export type RevenueAction = 'review' | 'pass' | 'reply' | 'assign' | 'quote' | 'schedule' | 'prove';

export interface RevenueQueueItem {
  id: string;
  sourceTable: string;
  title: string;
  status: string;
  expectedRevenueCents: number;
  expectedCostCents: number;
  expectedContributionCents: number;
  probability: number;
  timeToCashDays: number;
  recurrenceScore: number;
  relationshipScore: number;
  travelBurdenScore: number;
  evidenceQuality: number;
  weightedValueCents: number;
  priorityScore: number;
  recommendedAction: RevenueAction;
  evidence: string[];
}

export interface RevenueQueueSummary {
  dailyTargetCents: number;
  realizedTodayCents: number;
  remainingToTargetCents: number;
  weightedPipelineCents: number;
  items: RevenueQueueItem[];
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

function cents(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value) && value !== 0) return Math.round(value);
  }
  return 0;
}

function probabilityFor(record: Record<string, unknown>): number {
  const raw = Number(record.probability ?? record.close_probability ?? record.confidence ?? 0.5);
  return clamp(raw > 1 ? raw / 100 : raw);
}

function recommendedAction(record: Record<string, unknown>): RevenueAction {
  const status = String(record.status ?? record.stage ?? '').toLowerCase();
  if (status.includes('new') || status.includes('unreviewed')) return 'review';
  if (status.includes('qualified') || status.includes('engaged')) return 'reply';
  if (status.includes('quote') || status.includes('proposal')) return 'schedule';
  if (status.includes('booked') || status.includes('assigned')) return 'prove';
  if (status.includes('ready')) return 'assign';
  return 'review';
}

function buildItem(table: string, record: Record<string, unknown>): RevenueQueueItem {
  const expectedRevenueCents = cents(record, 'expected_revenue_cents', 'estimated_value_cents', 'quoted_amount_cents', 'amount_cents');
  const expectedCostCents = cents(record, 'expected_cost_cents', 'estimated_cost_cents', 'cost_cents');
  const expectedContributionCents = Math.max(0, expectedRevenueCents - expectedCostCents);
  const probability = probabilityFor(record);
  const timeToCashDays = Math.max(0, Number(record.time_to_cash_days ?? 7));
  const recurrenceScore = clamp(Number(record.recurrence_score ?? (record.recurring ? 0.8 : 0.25)));
  const relationshipScore = clamp(Number(record.relationship_score ?? 0.5));
  const travelBurdenScore = clamp(Number(record.travel_burden_score ?? 0.25));
  const evidenceQuality = clamp(Number(record.evidence_quality ?? (record.source_message_id || record.external_id ? 0.9 : 0.6)));
  const urgency = 1 / (1 + timeToCashDays / 7);
  const weightedValueCents = Math.round(expectedContributionCents * probability);
  const valueScale = Math.min(1, expectedContributionCents / 100_000);
  const priorityScore = Math.round(
    (valueScale * 35 + probability * 20 + urgency * 15 + recurrenceScore * 10 + relationshipScore * 10 + evidenceQuality * 10 - travelBurdenScore * 10) * 100
  ) / 100;
  const evidence = [record.source, record.external_id, record.source_message_id, record.proposal_id]
    .filter(Boolean)
    .map(String);

  return {
    id: String(record.id ?? record._canonical_id ?? ''),
    sourceTable: table,
    title: String(record.title ?? record.name ?? record.summary ?? record.id ?? 'Untitled opportunity'),
    status: String(record.status ?? record.stage ?? 'unknown'),
    expectedRevenueCents,
    expectedCostCents,
    expectedContributionCents,
    probability,
    timeToCashDays,
    recurrenceScore,
    relationshipScore,
    travelBurdenScore,
    evidenceQuality,
    weightedValueCents,
    priorityScore,
    recommendedAction: recommendedAction(record),
    evidence,
  };
}

export async function buildRevenueActionQueue(dailyTargetCents = 50_000): Promise<RevenueQueueSummary> {
  const store = getCanonicalStore();
  const [opportunities, engagements, revenueEvents] = await Promise.all([
    store.queryTable('opportunities', 5000),
    store.queryTable('engagements', 5000),
    store.queryTable('revenue_events', 5000),
  ]);

  const openStates = new Set(['new', 'open', 'qualified', 'engaged', 'proposal_sent', 'meeting_requested', 'scheduling_pending', 'booked', 'active', 'planned', 'ready']);
  const candidates = [
    ...opportunities.filter((record) => openStates.has(String(record.status ?? record.stage ?? 'open').toLowerCase())).map((record) => buildItem('opportunities', record)),
    ...engagements.filter((record) => ['planned', 'active', 'blocked'].includes(String(record.status ?? 'planned').toLowerCase())).map((record) => buildItem('engagements', record)),
  ].filter((item) => item.id && item.evidenceQuality > 0);

  candidates.sort((a, b) => b.priorityScore - a.priorityScore || b.weightedValueCents - a.weightedValueCents);

  const today = new Date().toISOString().slice(0, 10);
  const realizedTodayCents = revenueEvents
    .filter((event) => String(event.created_at ?? event.recorded_at ?? '').startsWith(today))
    .filter((event) => ['paid', 'collected', 'revenue'].includes(String(event.event_type ?? event.type ?? '').toLowerCase()))
    .reduce((sum, event) => sum + Number(event.amount_cents ?? 0), 0);

  return {
    dailyTargetCents,
    realizedTodayCents,
    remainingToTargetCents: Math.max(0, dailyTargetCents - realizedTodayCents),
    weightedPipelineCents: candidates.reduce((sum, item) => sum + item.weightedValueCents, 0),
    items: candidates,
  };
}
