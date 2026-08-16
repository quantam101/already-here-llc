import assert from 'assert';
import { buildAssetIntakeRecords, buildAssetIntakeWithFollowUp, buildMaintenanceRecord } from '../lib/assets.ts';
import { buildAhfosCloseoutRecords } from '../lib/ahfos.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

resetCanonicalStore();
const store = getCanonicalStore();

const input = {
  source: 'test_assets',
  customerName: 'Asset Owner',
  company: 'AssetCo',
  email: 'Owner@AssetCo.com',
  phone: '(480) 555-0100',
  assetName: 'Company Trailer',
  category: 'trailer',
  make: 'PJ',
  model: '2022',
  serialNumber: 'SN12345',
  assetTag: 'TAG-001',
  siteAddress: '789 Pine St',
  siteCity: 'Tempe',
  siteState: 'AZ',
  siteZip: '85281',
  notes: 'Stored on-site'
};

const writes = buildAssetIntakeRecords(input);
assert.equal(writes.length, 4); // org, contact, asset, site
assert.ok(writes.some((w) => w.table === 'assets'));

const result = await store.executeWrites(writes);
assert.equal(result.ok, true);

const assetId = writes.find((w) => w.table === 'assets').id;
const asset = await store.getRecord('assets', assetId);
assert.equal(asset.name, 'Company Trailer');
assert.equal(asset.status, 'active');
assert.equal(asset.serial_number, 'SN12345');
assert.equal(asset.make, 'PJ');

const contact = await store.getRecord('contacts', asset.contact_id);
assert.equal(contact.email, 'owner@assetco.com');
assert.equal(contact.phone, '4805550100');

const followUpWrites = buildAssetIntakeWithFollowUp({ ...input, assetName: 'Tracked Trailer' });
assert.equal(followUpWrites.length, 5);
assert.ok(followUpWrites.some((w) => w.table === 'followups'));

await store.executeWrites(followUpWrites);
const followUpId = followUpWrites.find((w) => w.table === 'followups').id;
const followUp = await store.getRecord('followups', followUpId);
assert.equal(followUp.related_record_type, 'asset');

const maintenanceInput = {
  assetId,
  source: 'test_maintenance',
  maintenanceType: 'inspection',
  result: 'pass',
  notes: 'Annual inspection passed',
  costCents: 5000
};
const maintenanceWrite = buildMaintenanceRecord(maintenanceInput, asset);
const maintResult = await store.executeWrites([maintenanceWrite]);
assert.equal(maintResult.ok, true);

const maintenance = await store.getRecord('maintenance', maintenanceWrite.id);
assert.equal(maintenance.maintenance_type, 'inspection');
assert.equal(maintenance.result, 'pass');
assert.equal(maintenance.cost_cents, 5000);

const longNameInput = {
  ...input,
  assetName: 'A very long asset name that would previously have truncated the serial number away'
};
const longNameWrites = buildAssetIntakeRecords(longNameInput);
const longNameAssetId = longNameWrites.find((w) => w.table === 'assets').id;
assert.notEqual(longNameAssetId, assetId, 'assets with different serials must not collapse');

const ahfosInput = {
  source: 'test_ahfos_upsert',
  customerName: 'Site Manager',
  company: 'AssetCo',
  email: 'owner@assetco.com',
  phone: '(480) 555-0100',
  site: {
    name: 'Main warehouse',
    address: '789 Pine St',
    city: 'Tempe',
    state: 'AZ',
    zip: '85281'
  },
  equipment: {
    name: 'Company Trailer',
    serialNumber: 'SN12345',
    assetTag: 'TAG-001'
  },
  problemDescription: 'Tire flat',
  resolutionDescription: 'Replaced tire',
  technicianId: 'tech_1234567890abcdef',
  qaStatus: 'pass',
  testResults: 'OK',
  customerSignatureReceived: true,
  revenueCents: 12000,
  technicianPayoutCents: 4000,
  partsUsed: ['Tire'],
  paymentStatus: 'collected'
};
const ahfosWrites = buildAhfosCloseoutRecords(ahfosInput);
const ahfosAssetId = ahfosWrites.find((w) => w.table === 'assets').id;
assert.equal(ahfosAssetId, assetId, 'AHFOS closeout should resolve to the same asset id as asset intake');

const ahfosResult = await store.executeWrites(ahfosWrites);
assert.equal(ahfosResult.ok, true);

const mergedAsset = await store.getRecord('assets', assetId);
assert.equal(mergedAsset.status, 'active', 'asset lifecycle status should be preserved after closeout');
assert.equal(mergedAsset.serial_number, 'SN12345', 'serial number should be preserved');
assert.equal(mergedAsset.purchase_date, asset.purchase_date, 'purchase_date should be preserved');
assert.equal(mergedAsset.warranty_expiry_date, asset.warranty_expiry_date, 'warranty expiry should be preserved');
assert.equal(mergedAsset.category, 'trailer', 'category should be preserved when closeout omits it');
assert.equal(mergedAsset.make, 'PJ', 'make should be preserved when closeout omits it');
assert.equal(mergedAsset.model, '2022', 'model should be preserved when closeout omits it');

const mergedOrg = await store.getRecord('organizations', ahfosWrites.find((w) => w.table === 'organizations').id);
const expectedDomain = input.email.split('@')[1].toLowerCase();
assert.equal(mergedOrg.domain, expectedDomain, 'organization domain should be preserved after closeout');
assert.ok(Array.isArray(mergedOrg.aliases) && mergedOrg.aliases.includes(expectedDomain), 'organization aliases should be preserved after closeout');

console.log('assets tests passed');
