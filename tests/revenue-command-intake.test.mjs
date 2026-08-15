import assert from 'assert';
import {
  buildRevenueCommandProofDemos,
  buildRevenueIntakeProof,
  classifyRevenueIntake,
  scoreRevenueIntake
} from '../lib/revenue-command-intake.ts';
import { validateRevenueAgentCoverage } from '../lib/revenue-command-agents.ts';

const coverage = validateRevenueAgentCoverage();
assert.equal(coverage.ok, true);
assert.equal(coverage.oneAgentPerTask, true);

const dispatch = buildRevenueIntakeProof({
  source: 'test_dispatch',
  fullName: 'Dispatch Test',
  company: 'Already Here LLC',
  email: 'dispatch@example.invalid',
  title: 'Urgent same-day dispatch revenue opportunity by noon $500',
  body: 'Network smart hands dispatch with same-day revenue target.',
  location: 'Phoenix, AZ',
  serviceType: 'Technical field operations',
  requestedWindow: 'today by noon',
  estimatedValueCents: 50000,
  submittedAt: '2026-06-18T12:00:00.000Z'
});
assert.equal(dispatch.ok, true);
assert.equal(dispatch.lane, 'Dispatch');
assert.equal(dispatch.priority, 'P0');
assert.equal(dispatch.persistedExternally, false);
assert.ok(dispatch.assignedAgentId.startsWith('agent_'));
assert.ok(dispatch.databaseReadyWrites.length >= 10);
assert.ok(dispatch.databaseReadyWrites.some((write) => write.table === 'leads'));
assert.ok(dispatch.databaseReadyWrites.some((write) => write.table === 'opportunities'));
assert.ok(dispatch.databaseReadyWrites.some((write) => write.table === 'dispatches'));
assert.ok(dispatch.databaseReadyWrites.some((write) => write.table === 'proof_of_work'));
assert.ok(dispatch.databaseReadyWrites.some((write) => write.table === 'ai_actions'));

const autoworksLane = classifyRevenueIntake({
  source: 'test_autoworks',
  fullName: 'Vehicle Test',
  company: 'Already Here AutoWorks',
  email: 'auto@example.invalid',
  title: 'No-start gas light-duty vehicle diagnostic',
  body: 'Battery, starter, and alternator diagnostic.',
  serviceType: 'AutoWorks diagnostic'
});
assert.equal(autoworksLane, 'AutoWorks');

const autoworks = buildRevenueIntakeProof({
  source: 'test_autoworks',
  fullName: 'Vehicle Test',
  company: 'Already Here AutoWorks',
  email: 'auto@example.invalid',
  title: 'No-start gas light-duty vehicle diagnostic',
  body: 'Battery, starter, and alternator diagnostic.',
  serviceType: 'AutoWorks diagnostic',
  submittedAt: '2026-06-18T12:00:00.000Z'
});
assert.ok(autoworks.databaseReadyWrites.some((write) => write.table === 'vehicles'));

const hauling = buildRevenueIntakeProof({
  source: 'test_hauling',
  fullName: 'Hauling Test',
  company: 'Storage Facility',
  email: 'haul@example.invalid',
  title: 'Storage cleanout haul route stack',
  body: 'Trailer pickup and route-fit scoring.',
  serviceType: 'Hauling cleanout',
  submittedAt: '2026-06-18T12:00:00.000Z'
});
assert.equal(hauling.lane, 'Hauling');
assert.ok(hauling.databaseReadyWrites.some((write) => write.table === 'hauling_jobs'));

const procurement = buildRevenueIntakeProof({
  source: 'test_procurement',
  fullName: 'Procurement Test',
  company: 'Vendor Target',
  email: 'proc@example.invalid',
  title: 'RFQ vendor portal review',
  body: 'Procurement target with owner approval required.',
  serviceType: 'RFQ target',
  submittedAt: '2026-06-18T12:00:00.000Z'
});
assert.equal(procurement.lane, 'Procurement');
assert.ok(procurement.databaseReadyWrites.some((write) => write.table === 'procurement_targets'));

const product = buildRevenueIntakeProof({
  source: 'test_product',
  fullName: 'Product Test',
  company: 'Digital Product Lane',
  email: 'product@example.invalid',
  title: 'Digital download product proof',
  body: 'Product and affiliate proof lane.',
  serviceType: 'Digital product proof',
  submittedAt: '2026-06-18T12:00:00.000Z'
});
assert.equal(product.lane, 'Product / Affiliate');
assert.ok(product.databaseReadyWrites.some((write) => write.table === 'products'));

const score = scoreRevenueIntake({
  source: 'test',
  fullName: 'Score Test',
  company: 'Already Here LLC',
  email: 'score@example.invalid',
  title: 'Review $500 dispatch revenue opportunity',
  body: 'Client quote request.',
  serviceType: 'Dispatch',
  estimatedValueCents: 50000
}, 'Dispatch');
assert.equal(score.priority, 'P1');

const demos = buildRevenueCommandProofDemos();
assert.equal(demos.length, 5);
assert.deepEqual(new Set(demos.map((demo) => demo.lane)), new Set(['Dispatch', 'AutoWorks', 'Hauling', 'Procurement', 'Product / Affiliate']));

const webLead = buildRevenueIntakeProof({
  source: 'website_intake',
  sourceId: 'form-123',
  channel: 'web',
  fullName: 'Acme Contact',
  company: 'Acme Inc',
  domain: 'acme.example.invalid',
  email: 'buyer@acme.example.invalid',
  phone: '(602) 555-0100',
  title: 'Dispatch request from website',
  body: 'Need same-day dispatch help.',
  submittedAt: '2026-06-18T12:00:00.000Z'
});
const smsLead = buildRevenueIntakeProof({
  source: 'sms_intake',
  sourceId: 'sms-456',
  channel: 'sms',
  fullName: 'Different Name',
  company: 'ACME, INC.',
  email: 'Buyer@ACME.example.invalid',
  phone: '602-555-0100',
  title: 'SMS dispatch help',
  body: 'Same day dispatch from SMS.',
  submittedAt: '2026-06-18T13:00:00.000Z'
});
const webOrg = webLead.databaseReadyWrites.find((write) => write.table === 'organizations');
const smsOrg = smsLead.databaseReadyWrites.find((write) => write.table === 'organizations');
const webContact = webLead.databaseReadyWrites.find((write) => write.table === 'contacts');
const smsContact = smsLead.databaseReadyWrites.find((write) => write.table === 'contacts');
assert.ok(webOrg && smsOrg, 'organization writes should exist');
assert.ok(webContact && smsContact, 'contact writes should exist');
assert.equal(webOrg.id, smsOrg.id, 'same domain should resolve to one canonical organization');
assert.equal(webContact.id, smsContact.id, 'same normalized email should resolve to one canonical contact');
assert.notEqual(webLead.intakeId, smsLead.intakeId, 'different source IDs should still produce distinct intake records');

console.log('revenue command intake tests passed');
