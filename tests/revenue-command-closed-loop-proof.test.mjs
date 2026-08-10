import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-proof-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'proof.sqlite3');

const { buildRevenueIntakeProof } = await import('../lib/revenue-command-intake.ts');
const {
  persistDatabaseReadyWrites,
  listRecords,
  getRecord,
  getDatabaseHealth,
  closeDatabase
} = await import('../lib/revenue-command-db.ts');
const { applyPipelineAction } = await import('../lib/revenue-command-pipeline.ts');
const { buildRouteStack, persistRouteStack } = await import('../lib/revenue-command-routing.ts');
const { recordAiOutcome } = await import('../lib/revenue-command-outcomes.ts');

const intake = buildRevenueIntakeProof({
  source: 'closed_loop_mobile_photo_quote',
  fullName: 'Proof Customer',
  company: 'Proof Customer Household',
  email: 'proof@example.invalid',
  phone: '6025550100',
  title: 'Same-day junk removal hauling pickup $650',
  body: 'Mobile photo quote identified a sofa, mattress, dresser, and mixed household load for same-day hauling.',
  location: 'Phoenix, AZ 85007',
  serviceType: 'Hauling and junk removal',
  requestedWindow: 'today 1pm-4pm',
  estimatedValueCents: 65000,
  submittedAt: '2026-08-10T18:00:00.000Z'
});

const intakePersist = await persistDatabaseReadyWrites(intake.databaseReadyWrites);
assert.equal(intakePersist.errors.length, 0);
assert.ok(intakePersist.inserted >= intake.databaseReadyWrites.length);

const opportunity = listRecords('opportunities', 10)[0];
assert.ok(opportunity, 'intake must create an owned opportunity');
const opportunityId = String(opportunity.id);
assert.ok(listRecords('contacts', 10).length >= 1);
assert.ok(listRecords('leads', 10).length >= 1);
assert.ok(listRecords('ai_actions', 10).length >= 1);
assert.ok(listRecords('ai_memory', 10).length >= 1);

for (const action of ['review', 'quote', 'assign', 'schedule', 'prove', 'invoice', 'payment', 'repeat']) {
  const result = await applyPipelineAction(opportunityId, action);
  assert.equal(result.ok, true, `${action} failed: ${result.message}`);
}

const paidEvent = listRecords('revenue_events', 20).find((event) => event.opportunity_id === opportunityId && event.event_type === 'paid');
assert.ok(paidEvent, 'completed payment must create a paid revenue event');
assert.equal(paidEvent.amount_cents, 65000);

const route = buildRouteStack(
  {
    id: 'hauling_operator_1',
    latitude: 33.4484,
    longitude: -112.0740,
    skills: ['hauling', 'junk-removal'],
    availableMinutes: 300
  },
  [
    {
      id: 'haul_job_proof',
      opportunityId,
      lane: 'hauling',
      latitude: 33.4488,
      longitude: -112.0830,
      requiredSkills: ['hauling'],
      estimatedRevenueCents: 65000,
      estimatedCostCents: 18000,
      estimatedMinutes: 120,
      priority: 'P0',
      slaDueAt: '2026-08-10T21:00:00.000Z'
    },
    {
      id: 'field_stackable_proof',
      opportunityId: 'opp_field_stackable',
      lane: 'field_service',
      latitude: 33.4540,
      longitude: -112.0700,
      requiredSkills: [],
      estimatedRevenueCents: 22000,
      estimatedCostCents: 3000,
      estimatedMinutes: 60,
      priority: 'P1'
    }
  ],
  '2026-08-10T18:30:00.000Z'
);
const persistedRoute = await persistRouteStack(route);
assert.equal(persistedRoute.persisted, true);
assert.ok(persistedRoute.contributionMarginCents >= 47000);
assert.ok(getRecord('route_stacks', persistedRoute.id));

const aiAction = listRecords('ai_actions', 20)[0];
assert.ok(aiAction);
const aiOutcome = await recordAiOutcome({
  aiActionId: String(aiAction.id),
  opportunityId,
  outcomeType: 'revenue',
  summary: 'Closed-loop hauling proof completed and payment record verified.',
  realizedRevenueCents: 65000,
  realizedCostCents: 18000,
  verificationStatus: 'verified',
  evidence: [
    { type: 'proof_of_work', count: listRecords('proof_of_work', 100).length },
    { type: 'payment', id: String(listRecords('payments', 20)[0]?.id || '') },
    { type: 'route_stack', id: persistedRoute.id }
  ],
  occurredAt: '2026-08-10T22:00:00.000Z'
});
assert.equal(aiOutcome.ok, true);
assert.equal(aiOutcome.contributionMarginCents, 47000);
assert.ok(aiOutcome.revenueEventId);

const finalOpportunity = getRecord('opportunities', opportunityId);
assert.equal(finalOpportunity?.status, 'repeat_customer');
assert.ok(listRecords('quotes', 20).length >= 1);
assert.ok(listRecords('jobs', 20).length >= 1);
assert.ok(listRecords('dispatches', 20).length >= 1);
assert.ok(listRecords('proof_of_work', 20).length >= 1);
assert.ok(listRecords('invoices', 20).length >= 1);
assert.ok(listRecords('payments', 20).length >= 1);
assert.ok(listRecords('repeating_customers', 20).length >= 1);
assert.ok(listRecords('outcomes', 20).length >= 1);
assert.ok(listRecords('ai_feedback', 20).length >= 1);
assert.ok(listRecords('audit_logs', 100).length >= 8);

const healthBeforeRestart = getDatabaseHealth();
assert.equal(healthBeforeRestart.durable, true);
closeDatabase();
assert.equal(getRecord('opportunities', opportunityId)?.status, 'repeat_customer');
assert.equal(getDatabaseHealth().recordCount, healthBeforeRestart.recordCount);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command closed-loop proof passed');
