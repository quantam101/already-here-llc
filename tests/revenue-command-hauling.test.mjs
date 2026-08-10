import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'revenue-hauling-'));
process.env.REVENUE_COMMAND_DB_PATH = join(dir, 'db.sqlite3');
const db = await import('../lib/revenue-command-db.ts');
const hauling = await import('../lib/revenue-command-hauling.ts');

await db.persistDatabaseReadyWrites([{ table: 'opportunities', id: 'opp-haul-1', action: 'insert', record: {
  id: 'opp-haul-1', lane: 'Hauling', revenue_lane_supported: 'Hauling', estimated_value_cents: 25000, priority: 'P1', score: 80,
  next_action: 'Generate quote', status: 'qualified', created_at: '2026-08-10T17:00:00.000Z', updated_at: '2026-08-10T17:00:00.000Z'
}}]);

const pricing = hauling.calculateHaulingQuote({
  items: [{ label: 'sofa', count: 1, volumeCubicFeet: 60, disposalCostCents: 2500, resaleValueCents: 0 }],
  estimatedMiles: 12,
  estimatedLaborMinutes: 60
});
assert.ok(pricing.quoteAmountCents >= 12500);
assert.ok(pricing.contributionMarginCents > 0);

const result = await hauling.createHaulingPhotoQuote({
  opportunityId: 'opp-haul-1', scanId: 'scan-1', pickupAddress: 'Phoenix, AZ', photoRefs: ['camera://scan-1/photo-1'],
  items: [{ label: 'sofa', count: 1, volumeCubicFeet: 60, disposalCostCents: 2500, confidence: 0.93 }],
  estimatedMiles: 12, estimatedLaborMinutes: 60, generatedAt: '2026-08-10T17:00:00.000Z'
});
assert.equal(result.ok, true);
assert.ok(db.getRecord('quotes', result.quoteId));
assert.ok(db.getRecord('hauling_jobs', result.haulingJobId));
assert.ok(db.getRecord('proof_of_work', result.proofId));
assert.equal(db.getRecord('quotes', result.quoteId)?.quote_status, 'draft_pending_owner_review');

db.closeDatabase();
rmSync(dir, { recursive: true, force: true });
console.log('revenue command hauling tests passed');
