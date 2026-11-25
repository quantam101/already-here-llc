import assert from 'node:assert/strict';
import {
  areaKeyFor,
  buildAreaScanPlan,
  buildAreaScanWrites,
  dispatchScanToProfitEngine,
  evaluatePaperwork,
  groupApplicantsByArea,
  queueAreaScan,
  requiredPaperwork
} from '../lib/area-prospecting.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

const oceanside = {
  applicantId: 'APP-TEST-0001',
  fullName: 'Test Tech',
  city: 'Oceanside',
  state: 'California',
  zipCode: '92054',
  workLanes: ['Network / AP / router / switch support', 'POS / printer / kiosk / scanner support', 'Access control / camera / AV support'],
  travelRadiusMiles: 50,
  transportation: 'Reliable vehicle',
  availability: 'Weekdays'
};

// Paperwork gate: W-9 + contractor agreement by default, configurable.
assert.deepEqual(requiredPaperwork({}), ['w9', 'contractor_agreement']);
assert.deepEqual(requiredPaperwork({ PAPERWORK_REQUIRED_ITEMS: 'w9,coi,bogus' }), ['w9', 'coi']);
assert.equal(evaluatePaperwork(['w9']).complete, false);
assert.deepEqual(evaluatePaperwork(['w9']).missing, ['contractor_agreement']);
assert.equal(evaluatePaperwork(['w9', 'contractor_agreement', 'coi']).complete, true);

// Plan: state normalized, lanes mapped, queries local, outreach never allowed.
assert.equal(areaKeyFor('oceanside', 'CA'), areaKeyFor('Oceanside', 'California'));
const plan = buildAreaScanPlan(oceanside);
assert.equal(plan.state, 'CA');
assert.equal(plan.skipped, false);
assert.deepEqual(plan.lanes, ['network', 'pos', 'access_control']);
assert.ok(plan.queries.every((query) => query.endsWith('Oceanside, CA')));
assert.equal(buildAreaScanPlan({ ...oceanside, travelRadiusMiles: 1000 }).radiusMiles, 100);

// Remote-only applicants are not scanned.
const remote = buildAreaScanPlan({ ...oceanside, applicantId: 'APP-TEST-R', transportation: 'Seeking fully remote assignments only. No travel or onsite field service required.' });
assert.equal(remote.skipped, true);
assert.equal(remote.skipReason, 'remote_only_applicant');

// Writes: scan job + operator review followup + link, gated.
const first = buildAreaScanWrites(oceanside, 'paperwork_complete', undefined, '2026-11-25T00:00:00.000Z');
const scan = first.writes.find((w) => w.table === 'area_prospect_scans');
assert.equal(scan.record.outreach_allowed, false);
assert.equal(scan.record.approval_required, true);
assert.equal(scan.record.status, 'queued');
assert.ok(first.writes.some((w) => w.table === 'followups' && w.record.lane === 'client_prospecting'));

// Second applicant in the same area joins the scan instead of duplicating it.
const second = buildAreaScanWrites({ ...oceanside, applicantId: 'APP-TEST-0002', travelRadiusMiles: 80 }, 'backfill', scan.record);
const joined = second.writes.find((w) => w.table === 'area_prospect_scans');
assert.equal(second.joinedExistingScan, true);
assert.equal(joined.id, scan.id);
assert.deepEqual(joined.record.applicant_ids, ['APP-TEST-0001', 'APP-TEST-0002']);
assert.equal(joined.record.radius_miles, 80);

// Grouping for backfill.
const groups = groupApplicantsByArea([oceanside, { ...oceanside, applicantId: 'APP-TEST-0002', city: 'OCEANSIDE', state: 'ca' }, { ...oceanside, applicantId: 'APP-TEST-3', city: 'Mesa', state: 'Arizona' }]);
assert.equal(groups.length, 2);

// Webhook: off without URL; signed and contact-free with URL.
assert.equal((await dispatchScanToProfitEngine(scan.record, {})).attempted, false);
let captured;
const fakeFetch = async (url, init) => { captured = { url, init }; return new Response('{}', { status: 202 }); };
const sent = await dispatchScanToProfitEngine(scan.record, { PROFITENGINE_AREA_SCAN_WEBHOOK_URL: 'https://pe.example/scan', PROFITENGINE_AREA_SCAN_WEBHOOK_SECRET: 's3cret' }, fakeFetch);
assert.equal(sent.ok, true);
assert.ok(captured.init.headers['x-ah-signature']);
assert.equal(JSON.parse(captured.init.body).outreach_allowed, false);
assert.equal(captured.init.body.includes('Test Tech'), false);

// End to end through the store and the paperwork route.
process.env.CANONICAL_STORE_TYPE = 'memory';
process.env.AHFOS_INTERNAL_API_KEY = 'test-internal-key';
resetCanonicalStore();
const store = getCanonicalStore();
const queued = await queueAreaScan(store, oceanside, 'operator_request', {});
assert.equal(queued.queued, true);
assert.equal((await store.getRecord('area_prospect_scans', queued.plan.scanId)).status, 'queued');

await store.executeWrites([{ table: 'applicants', id: 'APP-TEST-0009', action: 'insert', record: { ...oceanside, applicantId: 'APP-TEST-0009', city: 'Corona' } }]);
const { POST } = await import('../app/api/applicants/paperwork/route.ts');
const call = (body, key = 'test-internal-key') => POST(new Request('http://localhost/api/applicants/paperwork', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify(body)
}));

assert.equal((await call({ applicantId: 'APP-TEST-0009', received: ['w9'] }, 'wrong')).status, 401);
assert.equal((await call({ applicantId: 'APP-TEST-0009', received: ['w2'] })).status, 400);
const partial = await (await call({ applicantId: 'APP-TEST-0009', received: ['w9'] })).json();
assert.equal(partial.areaScan, 'waiting_on_paperwork');
const done = await (await call({ applicantId: 'APP-TEST-0009', received: ['contractor_agreement'] })).json();
assert.equal(done.complete, true);
assert.equal(done.areaScan, 'queued');
const again = await (await call({ applicantId: 'APP-TEST-0009', received: ['coi'] })).json();
assert.equal(again.areaScan, 'already_queued');

console.log('area prospecting tests passed');
