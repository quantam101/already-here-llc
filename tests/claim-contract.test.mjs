import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCanonicalStore, resetCanonicalStore, UpstashCanonicalStore } from '../lib/canonical-store.ts';

// No production credentials or network calls. The remote endpoint is an in-memory contract stub.
const envNames = ['CANONICAL_STORE_TYPE', 'CANONICAL_SQLITE_PATH', 'OCI_CANONICAL_URL', 'OCI_CANONICAL_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'VERCEL'];
const previous = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
const originalFetch = globalThis.fetch;
const dir = mkdtempSync(join(tmpdir(), 'alreadyhere-claim-'));
const table = 'stripe_events';
const id = 'evt_claim_contract_test';
const leaseMs = 300000;

async function exercise(store, label) {
  const record = { source: 'contract_test', event_id: id };
  const results = await Promise.all(Array.from({ length: 12 }, () => store.claimEvent(table, id, record, { leaseMs })));
  assert.equal(results.filter((result) => result === 'claimed').length, 1, label + ': exactly one winner');
  assert.equal(results.filter((result) => result === 'in_progress').length, 11, label + ': other claims blocked');
  const done = await store.executeWrites([{ table, id, action: 'upsert', record: { status: 'done' } }]);
  assert.equal(done.ok, true, label + ': completion write succeeds');
  assert.equal(await store.claimEvent(table, id, record, { leaseMs }), 'done', label + ': completed event is never reclaimed');
}

try {
  for (const name of envNames) delete process.env[name];
  process.env.CANONICAL_STORE_TYPE = 'memory';
  resetCanonicalStore();
  await exercise(getCanonicalStore(), 'memory');
  resetCanonicalStore();

  process.env.CANONICAL_STORE_TYPE = 'sqlite';
  process.env.CANONICAL_SQLITE_PATH = join(dir, 'claim.db');
  resetCanonicalStore();
  await exercise(getCanonicalStore(), 'sqlite');
  resetCanonicalStore();

  // OCI contract: verify request shape, auth header, and invalid outcome rejection.
  delete process.env.CANONICAL_SQLITE_PATH;
  delete process.env.CANONICAL_STORE_TYPE;
  process.env.OCI_CANONICAL_URL = 'https://oci-contract.invalid';
  process.env.OCI_CANONICAL_API_KEY = 'contract-test-only';
  let claims = 0;
  let completed = false;
  let invalid = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://oci-contract.invalid/claim');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['X-API-Key'], 'contract-test-only');
    const body = JSON.parse(options.body);
    assert.equal(body.table, table);
    assert.equal(body.id, id);
    assert.equal(body.leaseMs, leaseMs);
    if (invalid) return new Response(JSON.stringify({ ok: true, outcome: 'unexpected' }), { status: 200 });
    if (completed) return new Response(JSON.stringify({ ok: true, outcome: 'done' }), { status: 200 });
    claims++;
    return new Response(JSON.stringify({ ok: true, outcome: claims === 1 ? 'claimed' : 'in_progress' }), { status: 200 });
  };
  resetCanonicalStore();
  const remote = getCanonicalStore();
  const outcomes = await Promise.all(Array.from({ length: 6 }, () => remote.claimEvent(table, id, {}, { leaseMs })));
  assert.equal(outcomes.filter((outcome) => outcome === 'claimed').length, 1);
  assert.equal(outcomes.filter((outcome) => outcome === 'in_progress').length, 5);
  completed = true;
  assert.equal(await remote.claimEvent(table, id, {}, { leaseMs }), 'done');
  invalid = true;
  await assert.rejects(() => remote.claimEvent(table, id, {}, { leaseMs }), /invalid claim outcome/);
  resetCanonicalStore();

  // Upstash requires the configured atomic Redis client; no fallback to non-atomic writes.
  delete process.env.OCI_CANONICAL_URL;
  delete process.env.OCI_CANONICAL_API_KEY;
  const upstash = new UpstashCanonicalStore({
    hgetall: async () => null,
    hgetallMany: async () => [],
    zrangeRev: async () => [],
    write: async () => {},
  }, 'contract_test');
  await assert.rejects(() => upstash.claimEvent(table, id, {}, { leaseMs }), /Redis unavailable for atomic claim/);
  console.log('claim-contract tests passed (memory, sqlite, OCI stub, Upstash fail-closed)');
} finally {
  globalThis.fetch = originalFetch;
  resetCanonicalStore();
  for (const name of envNames) {
    if (previous[name] === undefined) delete process.env[name];
    else process.env[name] = previous[name];
  }
  rmSync(dir, { recursive: true, force: true });
}
