import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-autoworks-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'autoworks.sqlite3');

const { persistDatabaseReadyWrites, getRecord, listRecords, closeDatabase } = await import('../lib/revenue-command-db.ts');
const { createAutoWorksIntake, updateAutoWorksAuthorization, validateAutoWorksScope } = await import('../lib/revenue-command-autoworks.ts');

assert.match(validateAutoWorksScope('diesel', 'pickup') || '', /Diesel/);
assert.match(validateAutoWorksScope('gas', 'heavy-duty bus') || '', /Heavy-duty/);
assert.equal(validateAutoWorksScope('gas', 'light-duty pickup'), null);

const now = '2026-08-10T18:00:00.000Z';
await persistDatabaseReadyWrites([{ table: 'opportunities', id: 'opp_auto_1', action: 'insert', record: {
  id: 'opp_auto_1', contact_id: 'contact_auto_1', lane: 'AutoWorks', title: 'No-start diagnostic', status: 'new', created_at: now, updated_at: now
}}]);

const blocked = await createAutoWorksIntake({
  opportunityId: 'opp_auto_1', vin: '1FTFW1E50MFA00001', fuelType: 'diesel', vehicleClass: 'heavy-duty',
  conditionUponArrival: 'No start', requestedRepair: 'Diagnose', repairCategory: 'diagnostic'
});
assert.equal(blocked.ok, false);
assert.ok(blocked.blockedReason);

const intake = await createAutoWorksIntake({
  opportunityId: 'opp_auto_1',
  contactId: 'contact_auto_1',
  vin: '1FTFW1E50MFA00001',
  year: 2021,
  make: 'Ford',
  model: 'F-150',
  mileage: 45000,
  fuelType: 'gas',
  vehicleClass: 'light-duty pickup',
  location: 'Phoenix, AZ 85007',
  batteryVoltage: 11.8,
  conditionUponArrival: 'Vehicle parked curbside. No visible exterior damage beyond existing right-rear scratch.',
  insidePhotoRefs: ['photo://inside-1'],
  exteriorPhotoRefs: ['photo://outside-1'],
  underHoodPhotoRefs: ['photo://hood-1'],
  requestedRepair: 'Diagnose no-start and battery condition',
  repairCategory: 'diagnostic',
  estimateCents: 15000,
  observedAt: now
});
assert.equal(intake.ok, true);
assert.ok(intake.vehicleId);
assert.ok(intake.repairOrderId);
assert.equal(getRecord('vehicles', intake.vehicleId).vin, '1FTFW1E50MFA00001');
assert.equal(getRecord('repair_orders', intake.repairOrderId).authorization_status, 'pending');
assert.ok(listRecords('proof_of_work', 20).some((proof) => proof.proof_type === 'vehicle_arrival_condition'));

const cannotComplete = await updateAutoWorksAuthorization(intake.repairOrderId, false, 'owner', ['photo://after-1'], true);
assert.equal(cannotComplete.ok, false);
assert.ok(cannotComplete.blockedReason);

const authorized = await updateAutoWorksAuthorization(intake.repairOrderId, true, 'owner');
assert.equal(authorized.ok, true);
assert.equal(getRecord('repair_orders', intake.repairOrderId).status, 'authorized');

const completed = await updateAutoWorksAuthorization(intake.repairOrderId, true, 'owner', ['photo://after-1'], true);
assert.equal(completed.ok, true);
assert.equal(getRecord('repair_orders', intake.repairOrderId).status, 'completed');
assert.ok(listRecords('proof_of_work', 50).some((proof) => proof.proof_type === 'repair_closeout'));

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command autoworks tests passed');
