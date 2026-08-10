import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildRevenueIntakeProof } from '../lib/revenue-command-intake.ts';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-pipeline-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'revenue-command.json');

const { persistDatabaseReadyWrites, listRecords, getRecord, closeDatabase } =
  await import('../lib/revenue-command-db.ts');
const { applyPipelineAction } = await import('../lib/revenue-command-pipeline.ts');

const proof = buildRevenueIntakeProof({
  source: 'test_pipeline',
  fullName: 'Pipeline Test',
  company: 'Already Here LLC',
  email: 'pipeline@example.invalid',
  title: 'Urgent same-day dispatch revenue opportunity by noon $500',
  body: 'Network smart hands dispatch with same-day revenue target.',
  location: 'Phoenix, AZ',
  serviceType: 'Technical field operations',
  requestedWindow: 'today by noon',
  estimatedValueCents: 50000,
  submittedAt: '2026-06-18T12:00:00.000Z'
});

const { inserted, errors } = await persistDatabaseReadyWrites(proof.databaseReadyWrites);
assert.equal(errors.length, 0, `Unexpected persistence errors: ${errors.join(', ')}`);
assert.ok(inserted >= proof.databaseReadyWrites.length);

const opportunities = listRecords('opportunities', 10);
assert.equal(opportunities.length, 1);
const opportunityId = String(opportunities[0].id);
assert.ok(opportunityId);

let opp = getRecord('opportunities', opportunityId);
assert.equal(opp?.status, 'queued_for_review');

let result = await applyPipelineAction(opportunityId, 'review');
assert.equal(result.ok, true);
assert.equal(result.stage, 'under_review');

result = await applyPipelineAction(opportunityId, 'quote');
assert.equal(result.stage, 'proposal');
assert.equal(result.newRecordIds.length, 1);
assert.ok(getRecord('quotes', result.newRecordIds[0]));

result = await applyPipelineAction(opportunityId, 'schedule');
assert.equal(result.stage, 'dispatched');

result = await applyPipelineAction(opportunityId, 'prove');
assert.equal(result.stage, 'proof_recorded');

result = await applyPipelineAction(opportunityId, 'invoice');
assert.equal(result.stage, 'invoiced');

result = await applyPipelineAction(opportunityId, 'payment');
assert.equal(result.stage, 'paid');

result = await applyPipelineAction(opportunityId, 'repeat');
assert.equal(result.stage, 'repeat_customer');

opp = getRecord('opportunities', opportunityId);
assert.equal(opp?.status, 'repeat_customer');
assert.equal(getRecord('repeating_customers', result.newRecordIds[0])?.opportunity_id, opportunityId);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });

console.log('revenue command pipeline tests passed');
