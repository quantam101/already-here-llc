import assert from 'assert';
import { canonicalId } from '../lib/canonical-ids.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';
import { mergeCanonicalRecords, safeCanonicalUpsert } from '../lib/canonical-upsert.ts';
import { upsertEngagement, linkJobToEngagement, getEngagementSummary } from '../lib/engagements.ts';
import { resolveBusinessSignal } from '../lib/business-event-resolver.ts';
import { buildRevenueActionQueue } from '../lib/revenue-action-queue.ts';
import { recordSystemHealthSignal, buildSystemHealthSummary } from '../lib/system-health.ts';
import { ingestProfitEngineEvent } from '../lib/profitengine-bridge.ts';
import { recordAutoWorksOutcome, recordDispatchCloseout, recordHaulingOutcome } from '../lib/domain-outcomes.ts';
import { optimizeRoute } from '../lib/route-stack.ts';

process.env.CANONICAL_STORE_TYPE = 'memory';
delete process.env.OCI_CANONICAL_URL;
delete process.env.OCI_CANONICAL_API_KEY;
resetCanonicalStore();

const merged = mergeCanonicalRecords(
  { name: 'CPT', phone: '6025551111', aliases: ['CPT'], created_at: '2026-01-01T00:00:00Z' },
  { name: 'CPT Networks', phone: null, aliases: ['CPT Networks'], created_at: null },
);
assert.equal(merged.phone, '6025551111');
assert.deepEqual(merged.aliases, ['CPT', 'CPT Networks']);
assert.equal(merged.created_at, '2026-01-01T00:00:00Z');

const store = getCanonicalStore();
const orgId = canonicalId('org', 'cptnetworks.com');
await safeCanonicalUpsert('organizations', orgId, { name: 'CPT Networks', domain: 'cptnetworks.com', aliases: ['CPT'] });
await safeCanonicalUpsert('organizations', orgId, { name: 'CPT Networks', domain: null, aliases: ['CPT Networks'] });
const org = await store.getRecord('organizations', orgId);
assert.equal(org?.domain, 'cptnetworks.com');
assert.deepEqual(org?.aliases, ['CPT', 'CPT Networks']);

const engagement = await upsertEngagement({ organizationId: orgId, externalId: 'TCS-TEMPE-2026-08-17-21', title: 'TCS Tempe Aug 17-21', lane: 'field_it', expectedRevenueCents: 220000 });
const engagementId = String(engagement.id);
const jobId = canonicalId('job', 'J343292');
await safeCanonicalUpsert('jobs', jobId, { external_id: 'J343292', status: 'scheduled', expected_revenue_cents: 44000 });
await linkJobToEngagement(engagementId, jobId);
let summary = await getEngagementSummary(engagementId);
assert.equal(summary.jobs.length, 1);
assert.equal(summary.expectedRevenueCents, 264000);

const signal = {
  source: 'gmail', sourceMessageId: 'msg-1', externalId: 'WO-417217', organizationName: 'TechLink', contactName: 'Dispatch',
  email: 'dispatch@techlink.example', subject: 'Work Order WO-417217 rescheduled', body: 'Schedule changed to August 22 at 6:00 AM', scheduledAt: '2026-08-22T06:00:00-07:00'
};
const first = await resolveBusinessSignal(signal);
const duplicate = await resolveBusinessSignal(signal);
assert.equal(first.duplicate, false);
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.eventType, 'duplicate_notification');

await resolveBusinessSignal({ source: 'gmail', sourceMessageId: 'bounce-1', organizationName: 'Example', email: 'bad@example.invalid', subject: 'Delivery failed', body: 'Hard bounce recipient address rejected' });
const contacts = await store.queryTable('contacts', 100);
const bounced = contacts.find((contact) => contact.email === 'bad@example.invalid');
assert.equal(bounced?.suppressed, true);
assert.equal(bounced?.email_status, 'hard_bounce');

const opportunityId = canonicalId('opp', orgId, 'partner');
await safeCanonicalUpsert('opportunities', opportunityId, {
  organization_id: orgId, title: 'Arizona field partnership', status: 'qualified', expected_revenue_cents: 150000,
  expected_cost_cents: 50000, probability: 0.8, recurrence_score: 0.9, relationship_score: 0.9, evidence_quality: 1, source_message_id: 'mail-123'
});
const queue = await buildRevenueActionQueue();
assert.ok(queue.items.some((item) => item.id === opportunityId));
assert.equal(queue.dailyTargetCents, 50000);

await recordSystemHealthSignal({ source: 'already-here-llc', component: 'deployment', status: 'healthy', environment: 'production' });
await recordSystemHealthSignal({ source: 'profitenginev5', component: 'ai_failover', status: 'unhealthy', environment: 'production', failureClass: 'provider_unavailable' });
const health = await buildSystemHealthSummary();
assert.equal(health.overall, 'unhealthy');
assert.equal(health.byComponent.ai_failover, 'unhealthy');
assert.equal(health.byComponent.deployment, 'healthy');

await assert.rejects(
  () => ingestProfitEngineEvent({ type: 'revenue', externalId: 'mock-1', occurredAt: new Date().toISOString(), source: 'mock', payload: { amount_cents: 999999 } }),
  /Synthetic\/fabricated/,
);
const pe = await ingestProfitEngineEvent({ type: 'revenue', externalId: 'payment-1', occurredAt: new Date().toISOString(), source: 'stripe_webhook_verified', payload: { amount_cents: 12500, event_type: 'paid' }, evidence: { payment_id: 'payment-1' } });
assert.equal(pe.table, 'revenue_events');

const dispatchProof = await recordDispatchCloseout({ jobId, engagementId, problem: 'link down', resolution: 'replaced cable', qaScore: 98, revenueCents: 44000 });
assert.ok(dispatchProof.startsWith('proof_'));
summary = await getEngagementSummary(engagementId);
assert.ok(summary.realizedRevenueCents >= 44000);

const autoEngagement = await upsertEngagement({ organizationId: orgId, externalId: 'AUTO-1', title: 'Vehicle repair', lane: 'autoworks' });
const autoJobId = canonicalId('job', 'AUTOJOB-1');
await safeCanonicalUpsert('jobs', autoJobId, { status: 'active' });
const auto = await recordAutoWorksOutcome({ engagementId: String(autoEngagement.id), jobId: autoJobId, vin: '1HGCM82633A004352', diagnosis: 'battery', repair: 'replace battery', laborCostCents: 5000, partsCostCents: 12000, chargedCents: 30000, paymentStatus: 'paid' });
assert.ok(auto.vehicleId.startsWith('vehicle_'));

const haulEngagement = await upsertEngagement({ organizationId: orgId, externalId: 'HAUL-1', title: 'Haul job', lane: 'hauling' });
const haulJobId = canonicalId('job', 'HAULJOB-1');
await safeCanonicalUpsert('jobs', haulJobId, { status: 'active' });
const haul = await recordHaulingOutcome({ engagementId: String(haulEngagement.id), jobId: haulJobId, quotedCents: 45000, acceptedCents: 45000, predictedVolumeCuYd: 8, actualVolumeCuYd: 10, laborCostCents: 10000, disposalCostCents: 8000, recoveryValueCents: 3000, mileageCostCents: 2000 });
assert.equal(haul.gross_margin_cents, 28000);
assert.equal(haul.model_error_pct, 0.2);

const plan = optimizeRoute({
  startTime: '2026-08-22T05:30:00-07:00',
  minimumTurnaroundMinutes: 10,
  stops: [
    { id: 'a', type: 'service', lat: 33.445, lng: -112.07, windowStart: '2026-08-22T06:00:00-07:00', windowEnd: '2026-08-22T06:05:00-07:00', serviceTimeMinutes: 45, revenue: 150, anchor: true },
    { id: 'b', type: 'service', lat: 33.448, lng: -112.075, windowStart: '2026-08-22T07:00:00-07:00', windowEnd: '2026-08-22T07:05:00-07:00', serviceTimeMinutes: 60, revenue: 180, anchor: true },
  ],
});
assert.ok(['recommended', 'possible_with_risk', 'not_feasible'].includes(plan.feasibility));
assert.ok(Number.isFinite(plan.contributionMarginPerHour));

resetCanonicalStore();
console.log('platform control tests passed');
