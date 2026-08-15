import assert from 'assert';
import {
  buildWorkOrderRecords,
  buildAssignmentRecords,
  buildCloseoutRecords,
  matchTechniciansForWorkOrder
} from '../lib/field-operations.ts';
import { buildTechnicianRecords } from '../lib/technician.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

const technicianInput = {
  fullName: 'Jane Technician',
  email: 'jane.technician@example.invalid',
  phone: '(602) 555-0100',
  city: 'Phoenix',
  state: 'AZ',
  zipCode: '85001',
  workerPath: '1099_contractor',
  workLanes: ['Network / AP / router / switch support'],
  skills: 'I install network access points and run cabling. Same-day and weekend available.',
  certifications: 'CompTIA A+',
  tools: 'Cable tester, ladder',
  availability: 'Same-day, weekends, and travel available.',
  travelRadiusMiles: 75,
  transportation: 'Reliable insured pickup truck.',
  yearsExperience: 6,
  hourlyRate: '$85/hr',
  source: 'test'
};

const workOrderInput = {
  source: 'test_work_order',
  customerName: 'Acme Corp',
  company: 'Acme Corp',
  email: 'ops@acme.invalid',
  phone: '(602) 555-0200',
  siteAddress: '123 Main St',
  siteCity: 'Phoenix',
  siteState: 'AZ',
  siteZip: '85004',
  scope: 'Install three access points and run low-voltage cabling.',
  serviceType: 'Network install',
  priority: 'high',
  requestedDate: '2026-08-20',
  requestedWindow: 'morning',
  requiredSkills: ['network', 'cabling'],
  requiredCertifications: ['CompTIA A+'],
  requiredTools: ['cable tester'],
  rateBudgetCents: 9500,
  estimatedValueCents: 120000
};

resetCanonicalStore();
const store = getCanonicalStore();

const techWrites = buildTechnicianRecords(technicianInput);
await store.executeWrites(techWrites);

const workOrderWrites = buildWorkOrderRecords(workOrderInput);
assert.ok(workOrderWrites.some((w) => w.table === 'organizations'));
assert.ok(workOrderWrites.some((w) => w.table === 'contacts'));
assert.ok(workOrderWrites.some((w) => w.table === 'jobs'));
assert.ok(workOrderWrites.some((w) => w.table === 'opportunities'));

const workOrderResult = await store.executeWrites(workOrderWrites);
assert.equal(workOrderResult.ok, true);

const workOrderId = workOrderWrites.find((w) => w.table === 'jobs').id;
const matches = await matchTechniciansForWorkOrder(workOrderId);
assert.equal(matches.workOrderId, workOrderId);
assert.ok(matches.matches.length >= 1, 'expected at least one technician match');
assert.ok(matches.matches[0].fitScore > 0, 'match has positive fit score');

const technicianId = techWrites.find((w) => w.table === 'technicians').id;
const assignmentInput = {
  workOrderId,
  technicianId,
  assignedBy: 'dispatch@alreadyherellc.com',
  rateCents: 8500,
  scheduledStart: '2026-08-20T08:00:00Z',
  scheduledEnd: '2026-08-20T12:00:00Z'
};
const assignmentWrites = buildAssignmentRecords(assignmentInput);
const assignmentResult = await store.executeWrites(assignmentWrites);
assert.equal(assignmentResult.ok, true);
const assignmentId = assignmentWrites.find((w) => w.table === 'assignments').id;

const closeoutInput = {
  workOrderId,
  assignmentId,
  technicianId,
  actualStart: '2026-08-20T08:15:00Z',
  actualEnd: '2026-08-20T11:30:00Z',
  completionNotes: 'Installed three APs, tested signal, labeled cables.',
  partsUsed: ['3x access point', 'patch cables'],
  materialsUsed: ['cable ties', 'labels'],
  testingResults: 'Signal strength verified at -45 dBm in all zones.',
  customerSignatureReceived: true,
  qaStatus: 'pass',
  revenueCents: 120000,
  technicianPayoutCents: 34000,
  mileageMiles: 45,
  disposalCostCents: 0,
  recoveryRevenueCents: 0
};

const closeoutWrites = buildCloseoutRecords(closeoutInput);
assert.ok(closeoutWrites.some((w) => w.table === 'closeouts'));
assert.ok(closeoutWrites.some((w) => w.table === 'revenue_events'));
const closeoutResult = await store.executeWrites(closeoutWrites);
assert.equal(closeoutResult.ok, true);

const revenueId = closeoutWrites.find((w) => w.table === 'revenue_events').id;
const revenue = await store.getRecord('revenue_events', revenueId);
assert.equal(revenue.amount_cents, 120000);
assert.equal(revenue.gross_margin_cents, 120000 - 34000);
assert.equal(revenue.status, 'booked');

const workOrder = await store.getRecord('jobs', workOrderId);
assert.equal(workOrder.status, 'closed');
assert.equal(workOrder.revenue_cents, 120000);

console.log('field operations tests passed');
