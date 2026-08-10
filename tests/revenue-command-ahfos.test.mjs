import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'revenue-ahfos-'));
process.env.REVENUE_COMMAND_DB_PATH = join(dir, 'db.sqlite3');
const db = await import('../lib/revenue-command-db.ts');
const ahfos = await import('../lib/revenue-command-ahfos.ts');

const result = await ahfos.ingestAhfosJobSnapshot({
  jobId: 'AHFOS-JOB-1', opportunityId: 'opp-ahfos-1', technicianId: 'tech-1', status: 'completed', serviceType: 'network smart hands',
  siteAddress: 'Phoenix, AZ', closeoutNotes: 'Completed and verified', beforePhotos: ['before.jpg'], afterPhotos: ['after.jpg'], signatureRef: 'signature.png', checklistComplete: true, qaScore: 94, invoiceAmountCents: 50000,
  observedAt: '2026-08-10T17:00:00.000Z'
});
assert.equal(result.ok, true);
assert.equal(db.getRecord('jobs', 'AHFOS-JOB-1')?.source_system, 'AHFOS');
const dispatches = db.listRecords('dispatches', 10);
assert.equal(dispatches.length, 1);
assert.equal(dispatches[0].source_system, 'AHFOS');
assert.equal(dispatches[0].job_id, 'AHFOS-JOB-1');
assert.ok(db.getRecord('proof_of_work', result.proofId));
assert.equal(db.getDatabaseStats().outcomes, 1);
assert.equal(db.getDatabaseStats().analytics_events, 1);

db.closeDatabase();
rmSync(dir, { recursive: true, force: true });
console.log('revenue command AHFOS tests passed');
