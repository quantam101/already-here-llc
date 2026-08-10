import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-opportunity-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'opportunities.sqlite3');

const { calculateOpportunityComposite, ingestOpportunitySignal } = await import('../lib/revenue-command-opportunity.ts');
const { getRecord, listRecords, closeDatabase } = await import('../lib/revenue-command-db.ts');

const composite = calculateOpportunityComposite({
  sourceSystem: 'gmail',
  sourceRecordId: 'msg_123',
  sourceType: 'email',
  title: 'Phoenix hauling contract',
  lane: 'hauling',
  estimatedValueCents: 100000,
  nextAction: 'Review and price route economics',
  revenueImpactScore: 95,
  recurringRevenueScore: 65,
  dataNetworkScore: 70,
  dependencyScore: 60,
  riskReductionScore: 20,
  proofSpeedScore: 90,
  reusableProductScore: 75
});
assert.ok(composite >= 70);
assert.ok(composite <= 100);

const first = await ingestOpportunitySignal({
  sourceSystem: 'gmail',
  sourceRecordId: 'msg_123',
  sourceType: 'email',
  sourceUri: 'https://mail.google.com/example',
  title: 'Phoenix to San Francisco cargo route $1,000',
  lane: 'hauling',
  revenueLaneSupported: 'transport',
  estimatedValueCents: 100000,
  nextAction: 'Score mileage, fuel, time, vehicle fit, and contribution margin before replying.',
  recommendedFollowUpDate: '2026-08-10',
  revenueImpactScore: 95,
  recurringRevenueScore: 60,
  dataNetworkScore: 70,
  dependencyScore: 55,
  riskReductionScore: 25,
  proofSpeedScore: 95,
  reusableProductScore: 70,
  evidence: { city: 'Phoenix', destination: 'San Francisco', advertisedRevenueCents: 100000 },
  discoveredAt: '2026-08-10T15:00:00.000Z'
});
assert.equal(first.ok, true);
assert.equal(first.duplicate, false);
assert.ok(first.compositeScore >= 70);

const opportunity = getRecord('opportunities', first.opportunityId);
assert.ok(opportunity);
assert.equal(opportunity.source_system, 'gmail');
assert.equal(opportunity.estimated_value_cents, 100000);
assert.equal(getRecord('opportunity_sources', first.sourceId)?.opportunity_id, first.opportunityId);
assert.equal(getRecord('opportunity_scores', first.scoreId)?.composite_score, first.compositeScore);

const duplicate = await ingestOpportunitySignal({
  sourceSystem: 'gmail',
  sourceRecordId: 'msg_123',
  sourceType: 'email',
  title: 'Duplicate title should not create a second record',
  lane: 'hauling',
  nextAction: 'No action'
});
assert.equal(duplicate.ok, true);
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.opportunityId, first.opportunityId);
assert.equal(listRecords('opportunities', 100).length, 1);
assert.equal(listRecords('opportunity_sources', 100).length, 1);
assert.equal(listRecords('opportunity_scores', 100).length, 1);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command opportunity tests passed');
