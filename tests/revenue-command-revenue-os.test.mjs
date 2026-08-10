import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'revenue-os-'));
process.env.REVENUE_COMMAND_DB_PATH = join(dir, 'db.sqlite3');
const db = await import('../lib/revenue-command-db.ts');
const revenueOs = await import('../lib/revenue-command-revenue-os.ts');

const records = [
  { id: 'RP-001', source: 'test', lane: 'Field Services', revenue_play_name: 'Overflow Smart Hands', recommended_action: 'Prepare target list', status: 'SEED_READY', score_inputs: { daily_revenue_potential: 40, recurring_retainer: 30, database_ai_value: 20 }, opportunity_score: 90 },
  { id: 'RP-002', source: 'test', lane: 'Hauling', revenue_play_name: 'Route Stack Hauling', recommended_action: 'Prepare route candidates', status: 'SEED_READY', score_inputs: { daily_revenue_potential: 30, recurring_retainer: 20, database_ai_value: 20 }, opportunity_score: 70 }
];
const validation = revenueOs.validateRevenueOsRecords(records, 2);
assert.deepEqual(validation, []);
const result = await revenueOs.importRevenueOsRecords(records, { expectedCount: 2, importedAt: '2026-08-10T17:00:00.000Z' });
assert.equal(result.ok, true);
assert.equal(result.imported, 2);
assert.equal(db.getDatabaseStats().opportunities, 2);
assert.equal(db.getDatabaseStats().opportunity_sources, 2);
assert.equal(db.getDatabaseStats().opportunity_scores, 2);
const duplicate = await revenueOs.importRevenueOsRecords(records, { expectedCount: 2, importedAt: '2026-08-10T17:01:00.000Z' });
assert.equal(duplicate.ok, true);
assert.equal(duplicate.duplicates, 2);
const bad = revenueOs.validateRevenueOsRecords([{ ...records[0], id: 'BAD' }], 1);
assert.ok(bad.some((entry) => entry.includes('Invalid Revenue OS ID')));

db.closeDatabase();
rmSync(dir, { recursive: true, force: true });
console.log('revenue command Revenue OS tests passed');
