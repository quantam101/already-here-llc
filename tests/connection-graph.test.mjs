import assert from 'assert';
import { canonicalId } from '../lib/canonical-ids.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';
import { loadConnectionGraph, lookupGraph, publicFields } from '../lib/connection-graph.ts';

resetCanonicalStore();
const store = getCanonicalStore();

const orgId = canonicalId('org', 'Acme Properties');
const contactId = canonicalId('contact', orgId, 'owner@acme.invalid');
const techId = canonicalId('tech', 'pat@example.invalid');
const vehicleId = canonicalId('vehicle', orgId, '1HGCM82633A004352');
const jobId = canonicalId('job', 'test', 'job-1', '2026-10-18');
const skillId = canonicalId('skill', 'mechanic');
const assetId = canonicalId('asset', orgId, 'trailer-7');

const write = (table, id, record) =>
  store.executeWrites([{ table, id, action: 'insert', record: { id, ...record } }]);

await write('organizations', orgId, { name: 'Acme Properties', organization_type: 'customer' });
await write('contacts', contactId, {
  organization_id: orgId, full_name: 'Pat Owner',
  email: 'owner@acme.invalid', phone: '602-555-0100',
});
await write('technicians', techId, {
  organization_id: orgId, full_name: 'Sam Wrench',
  email: 'sam@example.invalid', skills_text: 'vehicle mechanic, brake work',
});
await write('vehicles', vehicleId, {
  contact_id: contactId, organization_id: orgId,
  year: 2019, make: 'Ford', model: 'F-150', vin: '1HGCM82633A004352',
});
await write('assets', assetId, {
  organization_id: orgId, name: 'Utility trailer 7',
  asset_type: 'Trailer', status: 'available', city: 'Phoenix', state: 'AZ',
});
await write('skills', skillId, { name: 'vehicle mechanic', category: 'vehicle' });
await write('technician_skills', canonicalId('ts', techId, skillId), {
  technician_id: techId, skill_id: skillId,
});
// site with an address-derived name must not publish the street
await write('sites', canonicalId('site', orgId, 's1'), {
  organization_id: orgId, name: '123 Main St, Phoenix, AZ',
  address: '123 Main St', city: 'Phoenix', state: 'AZ', zip: '85001',
});
await write('jobs', jobId, {
  contact_id: contactId, organization_id: orgId, vehicle_id: vehicleId,
  complaint: 'Brake inspection', location_city: 'Phoenix', location_state: 'AZ',
  status: 'queued_for_review',
});
// field-operations records key work orders as work_order_id
await write('assignments', canonicalId('asg', jobId, techId, '2026-10-18'), {
  work_order_id: jobId, technician_id: techId,
});
await write('closeouts', canonicalId('close', jobId, '2026-10-18'), {
  work_order_id: jobId, technician_id: techId,
});

// intake records written by the revenue-command-spine land in the
// leads/opportunities/dispatches tables — the graph must pick them up.
const leadId = canonicalId('lead', 'intake-1', 'lead');
const oppId = canonicalId('opp', jobId);
await write('leads', leadId, {
  contact_id: contactId, organization_id: orgId,
  title: 'Dispatch lead', lane: 'Dispatch', status: 'new',
});
await write('opportunities', oppId, {
  lead_id: leadId, contact_id: contactId, organization_id: orgId,
  job_id: jobId, title: 'Brake job opportunity', status: 'open',
});
await write('dispatches', canonicalId('dispatch', oppId), {
  job_id: jobId, technician_id: techId, vehicle_id: vehicleId,
  dispatch_status: 'queued_for_review',
});

// vehicle identity: a unit number rides along the year/make/model label
// (stored-only identifiers like VIN stay out of the graph entirely).
await write('vehicles', canonicalId('vehicle', orgId, 'unit-42'), {
  contact_id: contactId, year: 2021, make: 'Ford', model: 'Transit',
  unit_number: '42', vin: 'NM0GS9F77M1234567',
});

const graph = await loadConnectionGraph(store);

const personNodes = graph.nodes.filter((n) => n.kind === 'person');
assert.ok(personNodes.some((n) => n.label === 'Pat Owner'), 'contact should be a person node');
assert.ok(personNodes.some((n) => n.label === 'Sam Wrench'), 'technician should be a person node');
assert.ok(graph.nodes.some((n) => n.kind === 'vehicle' && n.label === '2019 Ford F-150'), 'vehicle node');
assert.ok(graph.nodes.some((n) => n.kind === 'equipment' && n.label === 'Utility trailer 7'), 'asset node');
assert.ok(graph.nodes.some((n) => n.kind === 'job' && n.label === 'Brake inspection'), 'job node');
assert.ok(graph.stats.nodes >= 7 && graph.stats.edges >= 7, 'stats should count nodes and edges');

// PII never leaves the layer
const flat = JSON.stringify(graph.nodes);
assert.ok(!flat.includes('owner@acme.invalid'), 'contact email must not appear');
assert.ok(!flat.includes('602-555-0100'), 'contact phone must not appear');
assert.ok(!flat.includes('1HGCM82633A004352'), 'VIN must not appear');
assert.ok(!flat.includes('123 Main St'), 'street address must not appear');
assert.ok(!flat.includes('85001'), 'zip must not appear');
const siteNode = graph.nodes.find((n) => n.kind === 'site');
assert.equal(siteNode?.label, 'Phoenix, AZ', 'site label falls back to city, state — not the address');
assert.ok(graph.nodes.some((n) => n.label === '2019 Ford F-150'), 'numeric year should appear in vehicle label');
assert.deepEqual(publicFields({ email: 'a@b.c', phone: '1', city: 'X' }), { city: 'X' });

// public scope: canonical records never load without authorization
const publicGraph = await loadConnectionGraph(store, false);
assert.ok(!publicGraph.nodes.some((n) => n.source === 'canonical'), 'public graph excludes canonical records');
assert.ok(!publicGraph.nodes.some((n) => n.id.includes(contactId)), 'public graph hides customers');

// Lookup connects person → vehicle → job → technician
const res = lookupGraph(graph, { q: 'Pat Owner' });
assert.equal(res.matches.length, 1);
const kinds = new Set(res.connections.map((n) => n.kind));
assert.ok(kinds.has('organization'), 'person lookup should reach the org');
assert.ok(kinds.has('vehicle'), 'person lookup should reach the vehicle');
assert.ok(kinds.has('job'), 'person lookup should reach the job');

const jobRes = lookupGraph(graph, { id: `canonical:job:${jobId}` });
const jobConnections = new Set(jobRes.connections.map((n) => n.id));
assert.ok(jobConnections.has(`canonical:person:${techId}`), 'job should connect to assigned technician');
assert.ok(jobRes.edges.some((e) => e.type === 'assigned_to_job'), 'assignment edge should exist');

const byKind = lookupGraph(graph, { kind: 'vehicle' });
assert.ok(byKind.matches.every((n) => n.kind === 'vehicle'), 'kind filter');
assert.ok(byKind.matches.length >= 1, 'vehicle lookup');

// intake pipeline nodes + edges
assert.ok(graph.nodes.some((n) => n.kind === 'lead' && n.label === 'Dispatch lead'), 'lead node');
assert.ok(graph.nodes.some((n) => n.kind === 'opportunity' && n.label === 'Brake job opportunity'), 'opportunity node');
assert.ok(graph.nodes.some((n) => n.kind === 'dispatch'), 'dispatch node');
const leadRes = lookupGraph(graph, { q: 'Dispatch lead' });
assert.ok(leadRes.edges.some((e) => e.type === 'lead_from_person'), 'lead→person edge');
assert.ok(leadRes.connections.some((n) => n.kind === 'opportunity'), 'lead should reach its opportunity');
const dispatchRes = lookupGraph(graph, { kind: 'dispatch' });
assert.ok(dispatchRes.edges.some((e) => e.type === 'dispatch_to_technician'), 'dispatch→technician edge');
assert.ok(dispatchRes.edges.some((e) => e.type === 'dispatch_on_vehicle'), 'dispatch→vehicle edge');

// vehicle unit identity is searchable; VIN stays out of the layer
const unitRes = lookupGraph(graph, { q: 'Unit 42' });
assert.ok(unitRes.matches.some((n) => n.label.includes('Unit 42') && n.label.includes('Transit')), 'unit number label');
assert.ok(!JSON.stringify(graph.nodes).includes('NM0GS9F77M1234567'), 'second VIN must not appear either');

const noMatch = lookupGraph(graph, { q: 'zzz-no-such-thing' });
assert.equal(noMatch.matches.length, 0);
assert.equal(noMatch.connections.length, 0);

// daily-command-os intake export → canonical upserts → graph nodes
const { syncFromExport } = await import('../lib/command-sync.ts');
const syncRes = await syncFromExport({
  leads: [{ id: 'L1', name: 'Dana Ops', email: 'dana@x.invalid', company: 'OpsCo', channel: 'form', message: 'needs help', status: 'qualified' }],
  rfqs: [{ id: 'R1', requester: 'Ron Buyer', email: 'ron@x.invalid', details: '20 laptops', status: 'new' }],
  dispatchRequests: [{ id: 'D1', requester: 'Sam Site', service: 'Smart Hands', location: 'Tempe, AZ', urgency: 'rush', status: 'assigned' }],
  brainItems: [{ id: 'B1', scope: 'repo', key: 'already-here-llc.deploy_target', value: '"vercel"', source: 'repo-scan' }],
}, store);
assert.equal(syncRes.errors.length, 0, `sync errors: ${syncRes.errors.join('; ')}`);
assert.equal(syncRes.upserted, 9, 'each intake record should upsert its contact/org/job chain');
const synced = await loadConnectionGraph(store);
assert.ok(synced.nodes.some((n) => n.label === 'Dana Ops'), 'dcos lead contact should graph as a person');
assert.ok(synced.nodes.some((n) => n.kind === 'lead' && n.id.includes('dcos-lead-L1')), 'dcos lead node');
assert.ok(synced.nodes.some((n) => n.kind === 'lead' && n.id.includes('dcos-rfq-R1')), 'dcos rfq node');
const dJob = synced.nodes.find((n) => n.kind === 'job' && n.id.includes('dcos-job-D1'));
assert.ok(dJob, 'dcos dispatch should create a job node');
const dLookup = lookupGraph(synced, { id: `canonical:dispatch:dcos-dispatch-D1` });
assert.ok(dLookup.edges.some((e) => e.type === 'dispatch_for_job'), 'dcos dispatch→job edge');
const kNode = synced.nodes.find((n) => n.kind === 'knowledge' && n.id.includes('dcos-brain-B1'));
assert.ok(kNode, 'brain item should graph as a knowledge node');
assert.equal(kNode.label, 'already-here-llc.deploy_target', 'knowledge label is the brain key');
const kLookup = lookupGraph(synced, { q: 'deploy_target' });
assert.ok(kLookup.matches.some((n) => n.kind === 'knowledge'), 'knowledge searchable by key');

console.log('connection-graph tests passed');
