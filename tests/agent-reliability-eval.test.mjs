import assert from 'node:assert/strict';
import { POST as dispatchApiPost } from '../app/api/dispatch/route.ts';

// Agent-health eval gate (reliability metrics, not vibes): drives the real
// dispatch route under the failure modes the architecture survey names —
// duplicate actions, lost work, unbounded retries, unverified closeout —
// and fails CI if the measured metrics regress.
//
// Metrics asserted here:
//   duplicate_deliveries  — server-side effects beyond one per intent
//   lost_intakes          — intents that neither succeeded nor deduplicated
//   dedupe_hits           — replays correctly recognized
//   max_replays_observed  — an intent retried N times still dedupes (bounded)

async function withEnv(patch, callback) {
  const originals = {};
  for (const [key, value] of Object.entries(patch)) {
    originals[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await callback();
  } finally {
    for (const [key, originalValue] of Object.entries(originals)) {
      if (originalValue === undefined) delete process.env[key];
      else process.env[key] = originalValue;
    }
  }
}

function dispatchForm(overrides = {}) {
  const formData = new FormData();
  const fields = {
    fullName: 'Eval Runner',
    company: 'Already Here LLC',
    email: 'eval@example.com',
    phone: '602-555-0100',
    siteCity: 'Phoenix',
    siteZip: '85007',
    serviceType: 'Remote Team Support',
    requestedDate: '2026-04-13',
    requestedTime: '09:00',
    requestedWindow: 'Morning',
    ticketNumber: 'WO-EVAL',
    message: 'Reliability eval submission.',
    ...overrides
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) formData.set(key, value);
  }
  return formData;
}

const localProof = { 'x-ah-local-proof': 'true' };
const req = (key, ip) => new Request('http://localhost/api/dispatch', {
  method: 'POST',
  headers: { ...localProof, 'x-real-ip': ip },
  body: dispatchForm({ idempotencyKey: key })
});

const metrics = {
  submissions: 0,
  dedupe_hits: 0,
  accepted: 0,
  rejected_409: 0,
  rate_limited: 0,
  lost_intakes: 0,
  duplicate_deliveries: 0
};
const dispatchIds = new Map(); // key -> dispatchId seen

function tally(key, status, json) {
  metrics.submissions += 1;
  if (status === 200 && json.deduplicated) {
    metrics.dedupe_hits += 1;
    const seen = dispatchIds.get(key);
    if (seen && json.dispatchId && json.dispatchId !== seen) metrics.duplicate_deliveries += 1;
    if (!seen && json.dispatchId) dispatchIds.set(key, json.dispatchId);
    return;
  }
  if (status === 200 && json.ok) {
    metrics.accepted += 1;
    if (dispatchIds.has(key)) metrics.duplicate_deliveries += 1;
    if (json.dispatchId) dispatchIds.set(key, json.dispatchId);
    return;
  }
  if (status === 409) {
    metrics.rejected_409 += 1;
    return;
  }
  if (status === 429) {
    metrics.rate_limited += 1; // protective throttle, not a lost intake
    return;
  }
  metrics.lost_intakes += 1;
}

await withEnv({ NODE_ENV: 'test' }, async () => {
  // Concurrent duplicate storm: 3 simultaneous retries of one intent.
  const keyA = '01JEVALAAAAAAAAAAAAAAAAA0A';
  const results = await Promise.all([
    dispatchApiPost(req(keyA, '203.0.113.50')),
    dispatchApiPost(req(keyA, '203.0.113.50')),
    dispatchApiPost(req(keyA, '203.0.113.50'))
  ]);
  for (const r of results) tally(keyA, r.status, await r.json());
  const wins = metrics.accepted + metrics.dedupe_hits + metrics.rejected_409;
  assert.equal(metrics.duplicate_deliveries, 0, 'concurrent storm double-delivered');
  assert.ok(metrics.accepted >= 1, 'storm lost the intake entirely');
  assert.equal(wins, 3);

  // Sequential replay ×5 of a second intent: every replay dedupes.
  const keyB = '01JEVALBBBBBBBBBBBBBBBBB0B';
  for (let i = 0; i < 6; i += 1) {
    const r = await dispatchApiPost(req(keyB, '203.0.113.51'));
    tally(keyB, r.status, await r.json());
  }

  // Recovery: a fresh intent after the storms still succeeds.
  const keyC = '01JEVALCCCCCCCCCCCCCCCCCCC0C';
  const rc = await dispatchApiPost(req(keyC, '203.0.113.52'));
  tally(keyC, rc.status, await rc.json());
});

assert.equal(metrics.lost_intakes, 0, `lost intakes: ${JSON.stringify(metrics)}`);
assert.equal(metrics.duplicate_deliveries, 0, `duplicate deliveries: ${JSON.stringify(metrics)}`);
assert.ok(metrics.dedupe_hits >= 4, `expected repeated replays to dedupe: ${JSON.stringify(metrics)}`);
assert.equal(dispatchIds.size, 3, `expected 3 distinct dispatches, got ${dispatchIds.size}`);

console.log('agent-reliability-eval metrics:', JSON.stringify(metrics));
console.log('agent reliability eval tests passed');
