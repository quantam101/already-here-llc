import assert from 'assert';
import { canonicalId } from '../lib/canonical-ids.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';
import { getWorkHistory, getWorkHistoryLeaderboard, rawEntityId } from '../lib/work-history.ts';
import { buildCloseoutRecords } from '../lib/field-operations.ts';

resetCanonicalStore();
const store = getCanonicalStore();

const orgId = canonicalId('org', 'Acme Properties');
const contactId = canonicalId('contact', orgId, 'owner@acme.invalid');
const techId = canonicalId('tech', 'sam@example.invalid');
const vehicleId = canonicalId('vehicle', orgId, 'VIN123');
const jobId = canonicalId('job', 'test', 'wo-1', '2026-10-18');
const assignmentId = canonicalId('assignment', jobId, techId, '2026-10-18');

const write = (table, id, record) =>
  store.executeWrites([{ table, id, action: 'insert', record: { id, ...record } }]);

await write('organizations', orgId, { name: 'Acme Properties' });
await write('contacts', contactId, { organization_id: orgId, full_name: 'Pat Owner' });
await write('technicians', techId, { organization_id: orgId, full_name: 'Sam Wrench' });
await write('vehicles', vehicleId, { organization_id: orgId, year: 2021, make: 'Ford', model: 'Transit' });
await write('jobs', jobId, {
  organization_id: orgId, contact_id: contactId, vehicle_id: vehicleId,
  service_type: 'Brake inspection', site_city: 'Phoenix', site_state: 'AZ',
});
await write('assignments', assignmentId, { work_order_id: jobId, technician_id: techId });

// Real closeout path — same writes as POST /api/closeouts
const writes = buildCloseoutRecords({
  workOrderId: jobId,
  assignmentId,
  technicianId: techId,
  actualStart: '2026-10-18T08:00:00Z',
  actualEnd: '2026-10-18T11:30:00Z',
  completionNotes: 'Replaced pads, tested braking system.',
  customerSignatureReceived: true,
  customerRating: 5,
  photos: [{ filename: 'after.jpg', mimeType: 'image/jpeg', sizeBytes: 12000 }],
  qaStatus: 'pass',
  revenueCents: 45000,
  technicianPayoutCents: 25000,
});
const res = await store.executeWrites(writes);
assert.ok(res.ok, 'closeout writes should succeed');

// --- per-technician history ---
const techHistory = await getWorkHistory(techId, store);
assert.ok(techHistory, 'technician should have work history');
assert.equal(techHistory.subject.kind, 'technician');
assert.equal(techHistory.subject.label, 'Sam Wrench');
assert.equal(techHistory.summary.jobs_completed, 1);
assert.equal(techHistory.summary.hours_worked, 3.5);
assert.equal(techHistory.summary.revenue_cents, 45000);
assert.equal(techHistory.summary.gross_margin_cents, 20000);
assert.equal(techHistory.summary.avg_customer_rating, 5);
assert.equal(techHistory.summary.qa_pass_rate, 100);
assert.equal(techHistory.summary.signed_closeouts, 1);
assert.equal(techHistory.summary.photos, 1);
assert.equal(techHistory.entries[0].service_type, 'Brake inspection');
assert.equal(techHistory.entries[0].site_label, 'Phoenix, AZ');

// --- graph node id works too ---
const viaNode = await getWorkHistory(`canonical:person:${techId}`, store);
assert.equal(viaNode.summary.jobs_completed, 1, 'node id resolves to raw entity');

// --- org + vehicle history via the job ---
const orgHistory = await getWorkHistory(orgId, store);
assert.equal(orgHistory.subject.label, 'Acme Properties');
assert.equal(orgHistory.summary.jobs_completed, 1);
const vehicleHistory = await getWorkHistory(vehicleId, store);
assert.equal(vehicleHistory.summary.jobs_completed, 1, 'vehicle carries its job history');
const jobHistory = await getWorkHistory(jobId, store);
assert.equal(jobHistory.entries[0].closeout_id, techHistory.entries[0].closeout_id);

// --- unknown entity → null, never fabricated ---
assert.equal(await getWorkHistory('canonical:person:ghost', store), null);
assert.equal(await getWorkHistory('nonexistent-id', store), null);

// --- leaderboard ---
const board = await getWorkHistoryLeaderboard(store);
assert.equal(board.summary.jobs_completed, 1);
assert.equal(board.technicians.length, 1);
assert.equal(board.technicians[0].label, 'Sam Wrench');
assert.equal(board.technicians[0].avg_customer_rating, 5);
assert.equal(board.organizations[0].label, 'Acme Properties');
assert.equal(board.organizations[0].revenue_cents, 45000);

// --- rawEntityId ---
assert.equal(rawEntityId('canonical:job:abc'), 'abc');
assert.equal(rawEntityId('plain-id'), 'plain-id');

// --- verified work passport ---
process.env.WORK_PASSPORT_SECRET = 'test-passport-key';
const { mintPassportToken, verifyPassportToken, getWorkPassport } = await import('../lib/work-passport.ts');
const token = mintPassportToken(techHistory.entries[0].closeout_id);
assert.ok(token, 'mint should produce a token');
assert.equal(verifyPassportToken(token), techHistory.entries[0].closeout_id, 'token round-trips');
assert.equal(verifyPassportToken(`${token}x`), null, 'tampered token rejected');
assert.equal(verifyPassportToken('garbage.token.here'), null);
const passport = await getWorkPassport(techHistory.entries[0].closeout_id, store);
assert.ok(passport);
assert.equal(passport.service_type, 'Brake inspection');
assert.equal(passport.technician, 'Sam', 'passport shows first name only');
assert.equal(passport.customer_rating, 5);
assert.equal(passport.signed, true);
assert.equal(passport.currency, 'USD');
assert.equal(await getWorkPassport('nonexistent', store), null);

console.log('work-history tests passed');
