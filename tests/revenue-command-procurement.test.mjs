import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'revenue-procurement-'));
process.env.REVENUE_COMMAND_DB_PATH = join(dir, 'db.sqlite3');

const db = await import('../lib/revenue-command-db.ts');
const procurement = await import('../lib/revenue-command-procurement.ts');

await db.persistDatabaseReadyWrites([{
  table: 'opportunities', id: 'opp-proc-test', action: 'insert', record: {
    id: 'opp-proc-test', lead_id: null, lane: 'Procurement', revenue_lane_supported: 'Procurement', estimated_value_cents: 250000,
    priority: 'P1', score: 80, next_action: 'Evaluate bid', status: 'qualified', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }
}]);

const evaluation = procurement.evaluateProcurementTarget({
  opportunityId: 'opp-proc-test', solicitationId: 'RFQ-001', targetType: 'RFQ', agencyOrBuyer: 'Test Buyer', estimatedValueCents: 250000,
  deadlineDate: '2099-01-01', requiredCertifications: ['VBE'], heldCertifications: ['VBE'], requiredCapabilities: ['network support'], availableCapabilities: ['network support']
}, Date.parse('2026-08-10T00:00:00Z'));
assert.equal(evaluation.eligible, true);
assert.equal(evaluation.compliancePercent, 100);
assert.equal(evaluation.capabilityPercent, 100);

const created = await procurement.createProcurementTarget({
  opportunityId: 'opp-proc-test', solicitationId: 'RFQ-001', targetType: 'RFQ', agencyOrBuyer: 'Test Buyer', estimatedValueCents: 250000,
  deadlineDate: '2099-01-01', requiredCertifications: ['VBE'], heldCertifications: ['VBE'], requiredCapabilities: ['network support'], availableCapabilities: ['network support']
});
assert.equal(created.ok, true);
assert.equal(db.getRecord('procurement_targets', created.targetId)?.submission_status, 'blocked_pending_owner_approval');
const approved = await procurement.approveProcurementPreparation(created.targetId, 'owner-test');
assert.equal(approved.ok, true);
assert.equal(db.getRecord('procurement_targets', created.targetId)?.submission_status, 'approved_for_preparation_not_submitted');
assert.equal(db.getRecord('procurement_targets', created.targetId)?.externally_submitted, 0);

db.closeDatabase();
rmSync(dir, { recursive: true, force: true });
console.log('revenue command procurement tests passed');
