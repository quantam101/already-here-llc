import assert from 'assert';
import {
  buildAutoworksIntakeRecords,
  buildAutoworksCloseoutRecords,
  matchTechniciansForAutoworksJob
} from '../lib/autoworks.ts';
import { buildTechnicianRecords } from '../lib/technician.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

const technicianInput = {
  fullName: 'Mike Mechanic',
  email: 'mike.mechanic@example.invalid',
  phone: '(602) 555-0300',
  city: 'Phoenix',
  state: 'AZ',
  zipCode: '85001',
  workerPath: '1099_contractor',
  workLanes: ['Auto / light-duty repair'],
  skills: 'Mobile mechanic, diagnostics, brake and electrical repair. ASE certified. Same-day available.',
  certifications: 'ASE',
  tools: 'Scan tool, jack, impact gun',
  availability: 'Same-day and weekends.',
  travelRadiusMiles: 40,
  transportation: 'Insured service van with lift.',
  yearsExperience: 8,
  hourlyRate: '$95/hr',
  source: 'test'
};

const intakeInput = {
  source: 'test_autoworks',
  customerName: 'Sarah Driver',
  company: 'Driver Auto LLC',
  email: 'sarah@driverauto.invalid',
  phone: '(602) 555-0400',
  vehicle: {
    vin: '1HGCM82633A123456',
    year: 2012,
    make: 'Honda',
    model: 'Accord',
    mileage: 112000,
    licensePlate: 'ABC123',
    color: 'Silver'
  },
  locationAddress: '456 Oak St',
  locationCity: 'Phoenix',
  locationState: 'AZ',
  locationZip: '85007',
  complaint: 'Check engine light on, rough idle, poor acceleration.',
  condition: {
    warningLights: ['check engine', 'maintenance required'],
    batteryCondition: 'Good',
    existingDamage: 'Minor scratches on rear bumper.'
  },
  serviceType: 'mechanic_intake',
  requestedDate: '2026-08-20',
  requestedWindow: 'morning',
  estimatedValueCents: 25000
};

resetCanonicalStore();
const store = getCanonicalStore();

const techWrites = buildTechnicianRecords(technicianInput);
await store.executeWrites(techWrites);

const intakeWrites = buildAutoworksIntakeRecords(intakeInput);
assert.ok(intakeWrites.some((w) => w.table === 'organizations'));
assert.ok(intakeWrites.some((w) => w.table === 'contacts'));
assert.ok(intakeWrites.some((w) => w.table === 'vehicles'));
assert.ok(intakeWrites.some((w) => w.table === 'jobs'));
assert.ok(intakeWrites.some((w) => w.table === 'opportunities'));

const intakeResult = await store.executeWrites(intakeWrites);
assert.equal(intakeResult.ok, true);

const jobId = intakeWrites.find((w) => w.table === 'jobs').id;
const vehicleId = intakeWrites.find((w) => w.table === 'vehicles').id;
const opportunityId = intakeWrites.find((w) => w.table === 'opportunities').id;

const vehicle = await store.getRecord('vehicles', vehicleId);
assert.equal(vehicle.vin, '1HGCM82633A123456');
assert.equal(vehicle.make, 'Honda');
assert.equal(vehicle.mileage, 112000);

const job = await store.getRecord('jobs', jobId);
assert.equal(job.lane, 'autoworks');
assert.equal(job.complaint, intakeInput.complaint);
assert.equal(job.status, 'queued_for_review');

const matches = await matchTechniciansForAutoworksJob(jobId);
assert.equal(matches.jobId, jobId);
assert.ok(matches.matches.length >= 1, 'expected at least one technician match');
assert.ok(matches.matches[0].fitScore > 0, 'match has positive fit score');

const closeoutInput = {
  jobId,
  technicianId: techWrites.find((w) => w.table === 'technicians').id,
  diagnosis: 'Faulty ignition coil on cylinder 2; spark plugs worn.',
  recommendedRepair: 'Replace ignition coil and spark plugs; test drive and clear codes.',
  customerAuthorization: true,
  parts: [
    { name: 'Ignition coil', quantity: 1, costCents: 4500 },
    { name: 'Spark plugs', quantity: 4, costCents: 2000 }
  ],
  laborCents: 15000,
  customerAcceptance: true,
  revenueCents: 25000,
  technicianPayoutCents: 12000,
  paymentStatus: 'collected'
};

const closeoutWrites = buildAutoworksCloseoutRecords(closeoutInput);
assert.ok(closeoutWrites.some((w) => w.table === 'closeouts'));
assert.ok(closeoutWrites.some((w) => w.table === 'revenue_events'));

const closeoutResult = await store.executeWrites(closeoutWrites);
assert.equal(closeoutResult.ok, true);

const revenueId = closeoutWrites.find((w) => w.table === 'revenue_events').id;
const revenue = await store.getRecord('revenue_events', revenueId);
assert.equal(revenue.amount_cents, 25000);
const partsCost = 4500 + 4 * 2000;
assert.equal(revenue.gross_margin_cents, 25000 - (partsCost + 12000 + 15000));
assert.equal(revenue.status, 'collected');

const closedJob = await store.getRecord('jobs', jobId);
assert.equal(closedJob.status, 'closed');
assert.equal(closedJob.revenue_cents, 25000);

const opportunity = await store.getRecord('opportunities', opportunityId);
assert.equal(opportunity.status, 'won');
assert.equal(opportunity.actual_value_cents, 25000);

console.log('autoworks tests passed');
