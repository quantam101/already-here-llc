import { canonicalId } from './canonical-ids';
import { getCanonicalStore } from './canonical-store';
import { safeCanonicalUpsert } from './canonical-upsert';

export interface EngagementInput {
  organizationId: string;
  opportunityId?: string;
  relationshipId?: string;
  externalId?: string;
  title: string;
  lane: string;
  status?: 'planned' | 'active' | 'blocked' | 'completed' | 'cancelled';
  startAt?: string;
  endAt?: string;
  expectedRevenueCents?: number;
  expectedCostCents?: number;
  source?: string;
}

export interface EngagementSummary {
  engagement: Record<string, unknown>;
  jobs: Record<string, unknown>[];
  revenueEvents: Record<string, unknown>[];
  expectedRevenueCents: number;
  realizedRevenueCents: number;
  expectedMarginCents: number;
  completionRate: number;
}

export async function upsertEngagement(input: EngagementInput): Promise<Record<string, unknown>> {
  const id = canonicalId('eng', input.organizationId, input.externalId || input.opportunityId || input.title);
  return safeCanonicalUpsert('engagements', id, {
    organization_id: input.organizationId,
    opportunity_id: input.opportunityId ?? null,
    relationship_id: input.relationshipId ?? null,
    external_id: input.externalId ?? null,
    title: input.title,
    lane: input.lane,
    status: input.status ?? 'planned',
    start_at: input.startAt ?? null,
    end_at: input.endAt ?? null,
    expected_revenue_cents: input.expectedRevenueCents ?? 0,
    expected_cost_cents: input.expectedCostCents ?? 0,
    source: input.source ?? 'engagements',
  });
}

export async function linkJobToEngagement(engagementId: string, jobId: string, source = 'engagements'): Promise<void> {
  const store = getCanonicalStore();
  const job = await store.getRecord('jobs', jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);
  await safeCanonicalUpsert('jobs', jobId, { ...job, engagement_id: engagementId, source });
  const eventId = canonicalId('engevt', engagementId, 'job_linked', jobId);
  await safeCanonicalUpsert('engagement_events', eventId, {
    engagement_id: engagementId,
    job_id: jobId,
    event_type: 'job_linked',
    source,
  });
}

export async function getEngagementSummary(engagementId: string): Promise<EngagementSummary> {
  const store = getCanonicalStore();
  const engagement = await store.getRecord('engagements', engagementId);
  if (!engagement) throw new Error(`Engagement not found: ${engagementId}`);
  const jobs = (await store.queryTable('jobs', 5000)).filter((record) => record.engagement_id === engagementId);
  const revenueEvents = (await store.queryTable('revenue_events', 5000)).filter((record) =>
    record.engagement_id === engagementId || jobs.some((job) => job.id === record.job_id)
  );
  const expectedRevenueCents = Number(engagement.expected_revenue_cents ?? 0) + jobs.reduce((sum, job) => sum + Number(job.expected_revenue_cents ?? 0), 0);
  const expectedCostCents = Number(engagement.expected_cost_cents ?? 0) + jobs.reduce((sum, job) => sum + Number(job.expected_cost_cents ?? 0), 0);
  const realizedRevenueCents = revenueEvents
    .filter((event) => ['paid', 'collected', 'revenue'].includes(String(event.event_type ?? event.type ?? '').toLowerCase()))
    .reduce((sum, event) => sum + Number(event.amount_cents ?? 0), 0);
  const completed = jobs.filter((job) => ['completed', 'closed', 'paid'].includes(String(job.status ?? '').toLowerCase())).length;
  return {
    engagement,
    jobs,
    revenueEvents,
    expectedRevenueCents,
    realizedRevenueCents,
    expectedMarginCents: expectedRevenueCents - expectedCostCents,
    completionRate: jobs.length ? completed / jobs.length : 0,
  };
}
