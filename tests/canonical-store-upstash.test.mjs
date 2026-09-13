import assert from 'assert';
import {
  UpstashCanonicalStore,
  getCanonicalStore,
  resetCanonicalStore,
} from '../lib/canonical-store.ts';

// Mimics @upstash/redis: hash field values are JSON text on the wire and auto-deserialized on read.
function createFakeRedis() {
  const hashes = new Map();
  const sortedSets = new Map();
  const calls = [];
  const decode = (key) => {
    const hash = hashes.get(key);
    if (!hash || hash.size === 0) return null;
    return Object.fromEntries([...hash.entries()].map(([field, value]) => [field, JSON.parse(value)]));
  };
  return {
    hashes,
    sortedSets,
    calls,
    async hgetall(key) {
      calls.push(['hgetall', key]);
      return decode(key);
    },
    async hgetallMany(keys) {
      calls.push(['hgetallMany', keys.length]);
      return keys.map(decode);
    },
    async zrangeRev(key, start, stop) {
      calls.push(['zrangeRev', key, start, stop]);
      const entries = [...(sortedSets.get(key) ?? new Map()).entries()];
      entries.sort((left, right) => right[1] - left[1] || right[0].localeCompare(left[0]));
      return entries.slice(start, stop + 1).map(([member]) => member);
    },
    async write(entry) {
      calls.push(['write', entry.key, entry.replace ? 'replace' : 'merge']);
      if (entry.replace) hashes.delete(entry.key);
      if (!hashes.has(entry.key)) hashes.set(entry.key, new Map());
      const hash = hashes.get(entry.key);
      for (const [field, value] of Object.entries(entry.fieldsIfAbsent)) {
        if (value === undefined) throw new Error(`undefined field ${field}`);
        if (!hash.has(field)) hash.set(field, JSON.stringify(value));
      }
      for (const [field, value] of Object.entries(entry.fields)) {
        if (value === undefined) throw new Error(`undefined field ${field}`);
        hash.set(field, JSON.stringify(value));
      }
      for (const { set, member } of entry.members) {
        if (!sortedSets.has(set)) sortedSets.set(set, new Map());
        const members = sortedSets.get(set);
        if (entry.replace || !members.has(member)) members.set(member, entry.score);
      }
    },
  };
}

const redis = createFakeRedis();
const store = new UpstashCanonicalStore(redis, 'canon_test');

const insert = await store.executeWrites([
  {
    table: 'outreach',
    id: 'outreach_a',
    action: 'insert',
    record: { id: 'outreach_a', email: 'a@example.invalid', status: 'sent', source: 'test', created_at: '2026-09-12T13:02:00.000Z' },
  },
  {
    table: 'outreach',
    id: 'outreach_b',
    action: 'insert',
    record: { id: 'outreach_b', email: 'b@example.invalid', status: 'sent', created_at: '2026-09-12T13:03:00.000Z' },
  },
  {
    table: 'organizations',
    id: 'org_a',
    action: 'insert',
    record: { id: 'org_a', name: 'Org A', created_at: '2026-09-12T13:01:00.000Z' },
  },
]);
assert.equal(insert.ok, true);
assert.deepEqual(insert.insertedIds, ['outreach_a', 'outreach_b', 'org_a']);
assert.ok(redis.hashes.has('canon_test:record:outreach:outreach_a'), 'records live under the configured prefix');
assert.ok(![...redis.hashes.keys()].some((key) => key.startsWith('ginc:')), 'must not touch GINC keys');

const stored = await store.getRecord('outreach', 'outreach_a');
assert.equal(stored?.email, 'a@example.invalid');
assert.equal(stored?._table, 'outreach');
assert.equal(stored?._canonical_id, 'outreach_a');
assert.equal(stored?.created_at, '2026-09-12T13:02:00.000Z');
assert.equal(stored?.source, 'test');

const orgDefaultSource = await store.getRecord('organizations', 'org_a');
assert.equal(orgDefaultSource?.source, 'organizations', 'source defaults to the table name');

assert.equal(await store.getRecord('outreach', 'missing'), undefined);

const upsert = await store.executeWrites([
  {
    table: 'outreach',
    id: 'outreach_a',
    action: 'upsert',
    record: { provider: 'gmail', provider_message_id: '1a095b6af83e7fdb' },
  },
]);
assert.equal(upsert.ok, true);
const merged = await store.getRecord('outreach', 'outreach_a');
assert.equal(merged?.email, 'a@example.invalid', 'upsert preserves existing fields');
assert.equal(merged?.status, 'sent');
assert.equal(merged?.provider_message_id, '1a095b6af83e7fdb');
assert.equal(merged?.created_at, '2026-09-12T13:02:00.000Z', 'upsert keeps original created_at');
assert.equal(merged?.source, 'test');
assert.ok(String(merged?.updated_at) > String(merged?.created_at));

// Upserts are field-level merges inside Redis, so two partial upserts based on the same stale
// snapshot cannot clobber each other (no client-side read-modify-write).
redis.calls.length = 0;
await store.executeWrites([{ table: 'outreach', id: 'outreach_b', action: 'upsert', record: { status: 'bounced' } }]);
assert.deepEqual(redis.calls, [['write', 'canon_test:record:outreach:outreach_b', 'merge']], 'upsert is a single merge write with no preceding read');
await Promise.all([
  store.executeWrites([{ table: 'outreach', id: 'outreach_a', action: 'upsert', record: { status: 'replied' } }]),
  store.executeWrites([{ table: 'outreach', id: 'outreach_a', action: 'upsert', record: { provider_thread_id: 'thread_a', sheet: { company: 'A', n: 1 } } }]),
]);
const concurrent = await store.getRecord('outreach', 'outreach_a');
assert.equal(concurrent?.status, 'replied');
assert.equal(concurrent?.provider_thread_id, 'thread_a');
assert.equal(concurrent?.provider_message_id, '1a095b6af83e7fdb', 'concurrent partial upserts keep every field');
assert.deepEqual(concurrent?.sheet, { company: 'A', n: 1 }, 'nested values round-trip');
assert.equal(concurrent?.created_at, '2026-09-12T13:02:00.000Z');

const replaced = await store.executeWrites([
  { table: 'outreach', id: 'outreach_a', action: 'insert', record: { id: 'outreach_a', email: 'a@example.invalid', created_at: '2026-09-12T13:02:00.000Z' } },
]);
assert.equal(replaced.ok, true);
const afterReplace = await store.getRecord('outreach', 'outreach_a');
assert.equal(afterReplace?.provider_message_id, undefined, 'insert replaces the whole record');
assert.equal(afterReplace?.source, 'outreach', 'insert without source defaults to the table');

const outreachRows = await store.queryTable('outreach');
assert.deepEqual(outreachRows.map((row) => row.id), ['outreach_b', 'outreach_a'], 'queryTable orders by created_at desc');
assert.equal((await store.queryTable('outreach', 1)).length, 1);
assert.deepEqual(await store.queryTable('outreach', 0), []);
assert.deepEqual(await store.queryTable('unknown_table'), []);

const allRows = await store.queryAll();
assert.deepEqual(allRows.map((row) => row.id), ['outreach_b', 'outreach_a', 'org_a']);
assert.equal((await store.queryAll(2)).length, 2);

const aiRunId = await store.recordAiRun({ agentId: 'agent', targetTable: 'outreach', targetId: 'outreach_a', action: 'score' });
assert.equal((await store.getRecord('ai_runs', aiRunId))?.agent_id, 'agent');
const reviewId = await store.recordReviewAction({ targetTable: 'outreach', targetId: 'outreach_a', action: 'pass' });
assert.equal((await store.getRecord('reviews', reviewId))?.decision, 'queued');
assert.equal((await store.queryAll()).length, 5);

const failing = new UpstashCanonicalStore(
  { ...redis, write: async () => { throw new Error('boom'); } },
  'canon_fail'
);
const failed = await failing.executeWrites([
  { table: 'outreach', id: 'x', action: 'insert', record: { id: 'x' } },
]);
assert.equal(failed.ok, false);
assert.equal(failed.failed[0].error, 'boom');
await assert.rejects(
  () => failing.recordAiRun({ agentId: 'agent', targetTable: 'outreach', targetId: 'x', action: 'score' }),
  /Upstash canonical write failed for ai_runs:.*boom/,
  'audit writes surface failures instead of returning an id'
);
await assert.rejects(
  () => failing.recordReviewAction({ targetTable: 'outreach', targetId: 'x', action: 'pass' }),
  /Upstash canonical write failed for reviews:.*boom/
);

// Store selection: upstash is opt-in and fails closed (never memory) when credentials are absent.
const previousEnv = {
  CANONICAL_STORE_TYPE: process.env.CANONICAL_STORE_TYPE,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  OCI_CANONICAL_URL: process.env.OCI_CANONICAL_URL,
  OCI_CANONICAL_API_KEY: process.env.OCI_CANONICAL_API_KEY,
  CANONICAL_SQLITE_PATH: process.env.CANONICAL_SQLITE_PATH,
};
try {
  delete process.env.OCI_CANONICAL_URL;
  delete process.env.OCI_CANONICAL_API_KEY;
  delete process.env.CANONICAL_SQLITE_PATH;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.CANONICAL_STORE_TYPE = 'upstash';
  resetCanonicalStore();
  assert.throws(() => getCanonicalStore(), /CANONICAL_STORE_TYPE=upstash requires UPSTASH_REDIS_REST_URL/, 'no credentials => throws instead of degrading to memory');

  process.env.UPSTASH_REDIS_REST_URL = 'https://example-upstash.invalid';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  resetCanonicalStore();
  assert.ok(getCanonicalStore() instanceof UpstashCanonicalStore, 'credentials + opt-in => upstash store');

  process.env.CANONICAL_STORE_TYPE = 'memory';
  resetCanonicalStore();
  assert.ok(!(getCanonicalStore() instanceof UpstashCanonicalStore), 'upstash never selected without opt-in');
} finally {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetCanonicalStore();
}

console.log('canonical-store-upstash tests passed');
