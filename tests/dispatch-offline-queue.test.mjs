import assert from 'node:assert/strict';

// Stub browser storage before importing the queue module.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  }
};

const {
  queueDispatchSubmission,
  replayDispatchQueue,
  getDispatchQueueDepth,
  getDispatchQueueStats
} = await import('../lib/dispatch-offline-queue.ts');

const queueKey = 'already_here_dispatch_offline_queue_v1';

function queuedRecords() {
  return JSON.parse(store.get(queueKey) ?? '[]');
}

const formData = new FormData();
formData.set('fullName', 'Offline Sender');
formData.set('company', 'Offline Co');
formData.set('email', 'offline@example.com');
formData.set('siteCity', 'Phoenix');
formData.set('serviceType', 'Smart Hands');
formData.set('message', 'Queued while offline.');

const record = queueDispatchSubmission(formData);
assert.ok(record, 'record queued');
assert.equal(record.status, 'queued');
assert.equal(record.attempts, 0);
assert.equal(getDispatchQueueDepth(), 1);

// Failing endpoint: first replay attempts once, then backs off — a second
// immediate replay defers instead of hammering the endpoint.
let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  fetchCalls += 1;
  return new Response('down', { status: 500 });
};

const first = await replayDispatchQueue();
assert.equal(first.attempted, 1);
assert.equal(first.replayed, 0);
assert.equal(fetchCalls, 1);

const afterFirst = queuedRecords()[0];
assert.equal(afterFirst.status, 'failed');
assert.equal(afterFirst.attempts, 1);
assert.ok(afterFirst.nextAttemptAt, 'backoff scheduled');
assert.ok(Date.parse(afterFirst.nextAttemptAt) > Date.now());

const second = await replayDispatchQueue();
assert.equal(second.attempted, 0, 'backoff defers immediate retry');
assert.equal(second.deferred, 1);
assert.equal(fetchCalls, 1, 'endpoint not hammered during backoff');

// Exhaustion: records at maxAttempts dead-letter and stop retrying.
const exhausted = {
  ...afterFirst,
  attempts: 5,
  maxAttempts: 6,
  nextAttemptAt: null
};
store.set(queueKey, JSON.stringify([exhausted]));

const third = await replayDispatchQueue();
assert.equal(third.attempted, 1);
assert.equal(third.dead, 1);
assert.equal(third.remaining, 0);
assert.equal(queuedRecords()[0].status, 'dead');

const fourth = await replayDispatchQueue();
assert.equal(fourth.attempted, 0, 'dead letters are never retried');
assert.equal(fetchCalls, 2);

const stats = getDispatchQueueStats();
assert.equal(stats.queued, 0);
assert.equal(stats.dead, 1);
assert.equal(getDispatchQueueDepth(), 0, 'dead letters do not count as pending');

// Recovery: a healthy endpoint replays a due record.
store.set(queueKey, JSON.stringify([{ ...record, status: 'queued' }]));
globalThis.fetch = async () => new Response('{"ok":true}', { status: 200 });
const recovered = await replayDispatchQueue();
assert.equal(recovered.replayed, 1);
assert.equal(queuedRecords().length, 0);

// Regression: a submission enqueued while a replay is awaiting the server must
// survive the replay's write-back (previously the stale snapshot overwrote it).
store.set(queueKey, JSON.stringify([{ ...record, id: 'offline-a', status: 'queued' }]));
let releaseFetch;
const fetchGate = new Promise((resolve) => { releaseFetch = resolve; });
let concurrentFetchCalls = 0;
globalThis.fetch = async () => {
  concurrentFetchCalls += 1;
  await fetchGate;
  return new Response('{"ok":true}', { status: 200 });
};

const pendingReplay = replayDispatchQueue();
await Promise.resolve();
const lateForm = new FormData();
lateForm.set('fullName', 'Late Sender');
lateForm.set('email', 'late@example.com');
lateForm.set('message', 'Enqueued mid-replay.');
const lateRecord = queueDispatchSubmission(lateForm);
assert.ok(lateRecord, 'late record queued while replay pending');
assert.equal(queuedRecords().length, 2, 'both records present before replay commits');

// Overlapping callers share the in-flight pass instead of re-sending the batch.
const overlappingReplay = replayDispatchQueue();
assert.equal(overlappingReplay, pendingReplay, 'overlapping replay returns the in-flight promise');

releaseFetch();
const concurrentResult = await pendingReplay;
assert.equal(concurrentFetchCalls, 1, 'snapshot batch POSTed exactly once despite overlapping callers');
assert.equal(concurrentResult.replayed, 1);
assert.equal(concurrentResult.remaining, 1, 'late enqueue is reported as still pending');
const survivors = queuedRecords();
assert.equal(survivors.length, 1, 'late enqueue survived the replay write-back');
assert.equal(survivors[0].id, lateRecord.id);
assert.equal(survivors[0].status, 'queued');

// After the pass settles, a fresh replay picks up the late record.
globalThis.fetch = async () => { concurrentFetchCalls += 1; return new Response('{"ok":true}', { status: 200 }); };
const followUp = await replayDispatchQueue();
assert.equal(followUp.replayed, 1);
assert.equal(concurrentFetchCalls, 2);
assert.equal(queuedRecords().length, 0);

// Failure path: the in-flight guard clears even when fetch throws, so the
// next pass is not blocked forever.
store.set(queueKey, JSON.stringify([{ ...record, id: 'offline-b', status: 'queued' }]));
globalThis.fetch = async () => { throw new TypeError('network down'); };
const thrown = await replayDispatchQueue();
assert.equal(thrown.attempted, 1);
assert.equal(queuedRecords()[0].status, 'failed');
assert.equal(queuedRecords()[0].lastError, 'network down');
store.set(queueKey, JSON.stringify([{ ...record, id: 'offline-c', status: 'queued' }]));
globalThis.fetch = async () => new Response('{"ok":true}', { status: 200 });
const afterThrow = await replayDispatchQueue();
assert.equal(afterThrow.attempted, 1, 'guard released after a throwing pass');
assert.equal(afterThrow.replayed, 1);

globalThis.fetch = originalFetch;
console.log('dispatch offline queue tests passed');
