import assert from 'assert';
import { buildAhfosCloseoutRecords } from '../lib/ahfos.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

resetCanonicalStore();
const store = getCanonicalStore();

const input = {
  source: 'test_ahfos',
  customerName: 'Site Manager',
  company: 'SiteCo LLC',
  email: 'manager@siteco.invalid',
  phone: '(602) 555-0600',
  site: {
    name: 'Main warehouse',
    address: '789 Industrial Blvd',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85009'
  },
  equipment: {
    name: 'Warehouse access control panel',
    category: 'Security',
    make: 'HID',
    model: 'VertX V2000',
    serialNumber: 'V2000-ABC-1234',
    assetTag: 'ACP-001'
  },
  problemDescription: 'Door controllers offline after power surge. Readers not responding.',
  resolutionDescription: 'Replaced damaged power supply and reset controllers. Verified reader response at all four doors.',
  technicianId: 'tech_1234567890abcdef',
  qaStatus: 'pass',
  testResults: 'All readers green; door release tested.',
  customerSignatureReceived: true,
  revenueCents: 87500,
  technicianPayoutCents: 25000,
  partsUsed: ['Power supply 24V 5A', 'Fuse kit'],
  materialsUsed: ['Cable ties', 'Labels'],
  paymentStatus: 'collected'
};

const writes = buildAhfosCloseoutRecords(input);
assert.ok(writes.some((w) => w.table === 'organizations'));
assert.ok(writes.some((w) => w.table === 'contacts'));
assert.ok(writes.some((w) => w.table === 'assets'));
assert.ok(writes.some((w) => w.table === 'sites'));
assert.ok(writes.some((w) => w.table === 'jobs'));
assert.ok(writes.some((w) => w.table === 'assignments'));
assert.ok(writes.some((w) => w.table === 'closeouts'));
assert.ok(writes.some((w) => w.table === 'revenue_events'));
assert.ok(writes.some((w) => w.table === 'proof_of_work'));
assert.ok(writes.some((w) => w.table === 'opportunities'));

const result = await store.executeWrites(writes);
assert.equal(result.ok, true);

const jobId = writes.find((w) => w.table === 'jobs').id;
const closeoutId = writes.find((w) => w.table === 'closeouts').id;
const revenueId = writes.find((w) => w.table === 'revenue_events').id;
const opportunityId = writes.find((w) => w.table === 'opportunities').id;

const job = await store.getRecord('jobs', jobId);
assert.equal(job.lane, 'ahfos');
assert.equal(job.status, 'closed');
assert.equal(job.equipment_serial, 'V2000-ABC-1234');

const closeout = await store.getRecord('closeouts', closeoutId);
assert.equal(closeout.qa_status, 'pass');
assert.equal(closeout.resolution_description, input.resolutionDescription);

const revenue = await store.getRecord('revenue_events', revenueId);
assert.equal(revenue.amount_cents, 87500);
assert.equal(revenue.gross_margin_cents, 62500);
assert.equal(revenue.status, 'collected');

const opportunity = await store.getRecord('opportunities', opportunityId);
assert.equal(opportunity.status, 'won');

console.log('ahfos tests passed');
