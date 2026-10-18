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

const noMatch = lookupGraph(graph, { q: 'zzz-no-such-thing' });
assert.equal(noMatch.matches.length, 0);
assert.equal(noMatch.connections.length, 0);

console.log('connection-graph tests passed');
