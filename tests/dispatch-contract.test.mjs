import assert from 'node:assert/strict';
import { GET as dispatchApiGet, POST as dispatchApiPost } from '../app/api/dispatch/route.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

async function withEnv(patch, callback) {
  const originals = {};

  for (const [key, value] of Object.entries(patch)) {
    originals[key] = process.env[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await callback();
  } finally {
    for (const [key, originalValue] of Object.entries(originals)) {
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  }
}

function dispatchForm(overrides = {}) {
  const formData = new FormData();
  const fields = {
    fullName: 'Taylor Buyer',
    company: 'Already Here LLC',
    email: 'test@example.com',
    phone: '602-555-0100',
    siteCity: 'Phoenix',
    siteZip: '85007',
    serviceType: 'Remote Team Support',
    requestedDate: '2026-04-13',
    requestedTime: '09:00',
    requestedWindow: 'Morning',
    ticketNumber: 'WO-123',
    message: 'Replace failed device and confirm closeout.',
    ...overrides
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) formData.set(key, value);
  }

  return formData;
}

function formRequest(formData, headers = {}) {
  return new Request('http://localhost/api/dispatch', {
    method: 'POST',
    headers,
    body: formData
  });
}

await withEnv(
  {
    RESEND_API_KEY: 'test',
    DISPATCH_TO_EMAIL: 'dispatch@example.com',
    FORMSPREE_ENDPOINT: ''
  },
  async () => {
    const response = await dispatchApiGet();
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.status, 'ok');
    assert.equal(json.delivery, 'resend');
    assert.equal(json.records, 'dispatch_email_json_attachment_plus_revenue_spine');
  }
);

await withEnv(
  {
    RESEND_API_KEY: '',
    DISPATCH_TO_EMAIL: '',
    FORMSPREE_ENDPOINT: 'https://example.com/formspree'
  },
  async () => {
    const response = await dispatchApiGet();
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.status, 'ok');
    assert.equal(json.delivery, 'formspree');
    assert.equal(json.records, 'formspree_payload_plus_revenue_spine');
  }
);

{
  const response = await dispatchApiPost(formRequest(new FormData(), { 'x-real-ip': '203.0.113.10' }));
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.message, 'Missing required field: fullName');
}

{
  const formData = dispatchForm({ website: 'bot' });
  const response = await dispatchApiPost(formRequest(formData, { 'x-real-ip': '203.0.113.11' }));
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.message, 'Submission rejected.');
}

{
  const formData = dispatchForm({ email: 'not-an-email' });
  const response = await dispatchApiPost(formRequest(formData, { 'x-real-ip': '203.0.113.12' }));
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.message, 'Invalid email address.');
}

await withEnv(
  {
    RESEND_API_KEY: '',
    DISPATCH_TO_EMAIL: '',
    FORMSPREE_ENDPOINT: ''
  },
  async () => {
    const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-real-ip': '203.0.113.13' }));
    assert.equal(response.status, 503);
    const json = await response.json();
    assert.match(json.message, /Dispatch delivery is unavailable/);

  }
);

// Provider failover: a configured-but-failing Resend must fall back to Formspree
// (retry/recovery + failover), not 502 the intake.
await withEnv(
  {
    RESEND_API_KEY: 'test',
    DISPATCH_TO_EMAIL: 'dispatch@example.com',
    FORMSPREE_ENDPOINT: 'https://example.com/formspree'
  },
  async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    const hostOf = (input) => new URL(String(input)).hostname;
    globalThis.fetch = async (input) => {
      const host = hostOf(input);
      calls.push(host);
      if (host === 'api.resend.com') {
        return new Response(JSON.stringify({ message: 'resend down' }), { status: 500 });
      }
      if (host === 'example.com') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    };
    try {
      const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-real-ip': '203.0.113.14' }));
      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.ok, true);
      assert.equal(json.delivery, 'formspree');
      assert.equal(json.failoverUsed, true);
      assert.equal(json.persistedExternally, true);
      assert.equal(calls.filter((h) => h === 'api.resend.com').length, 2, 'resend attempted twice before failover');
      assert.equal(calls.filter((h) => h === 'example.com').length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);

// Resend succeeds on retry: no failover, delivery stays resend.
await withEnv(
  {
    RESEND_API_KEY: 'test',
    DISPATCH_TO_EMAIL: 'dispatch@example.com',
    FORMSPREE_ENDPOINT: 'https://example.com/formspree'
  },
  async () => {
    const originalFetch = globalThis.fetch;
    let resendCalls = 0;
    globalThis.fetch = async (input) => {
      const host = new URL(String(input)).hostname;
      if (host === 'api.resend.com') {
        resendCalls += 1;
        if (resendCalls === 1) return new Response(JSON.stringify({ message: 'transient' }), { status: 500 });
        return new Response(JSON.stringify({ id: 'email-1' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    };
    try {
      const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-real-ip': '203.0.113.15' }));
      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.delivery, 'resend');
      assert.equal(json.failoverUsed, false);
      assert.ok(resendCalls >= 3, 'first email retried, second email sent');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);

// Both providers down: intake fails closed with 502 and records provider errors.
await withEnv(
  {
    RESEND_API_KEY: 'test',
    DISPATCH_TO_EMAIL: 'dispatch@example.com',
    FORMSPREE_ENDPOINT: 'https://example.com/formspree'
  },
  async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'down' }), { status: 500 });
    try {
      const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-real-ip': '203.0.113.16' }));
      assert.equal(response.status, 502);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);

// Exactly-once: replaying the same idempotency key returns the original result
// instead of creating a second dispatch.
await withEnv(
  {
    RESEND_API_KEY: '',
    DISPATCH_TO_EMAIL: '',
    FORMSPREE_ENDPOINT: ''
  },
  async () => {
    const key = '01JEXAMPLEKEY0000000000000A';
    const localProof = { 'x-real-ip': '203.0.113.20', 'x-ah-local-proof': 'true' };

    const first = await dispatchApiPost(formRequest(dispatchForm({ idempotencyKey: key }), localProof));
    assert.equal(first.status, 200);
    const firstJson = await first.json();
    assert.equal(firstJson.ok, true);
    assert.ok(firstJson.dispatchId, 'first submission mints a dispatch id');

    const replay = await dispatchApiPost(formRequest(dispatchForm({ idempotencyKey: key }), localProof));
    assert.equal(replay.status, 200);
    const replayJson = await replay.json();
    assert.equal(replayJson.deduplicated, true, 'replayed key is deduplicated');
    assert.equal(replayJson.dispatchId, firstJson.dispatchId, 'replay returns the original dispatch id');

    const fresh = await dispatchApiPost(
      formRequest(dispatchForm({ idempotencyKey: '01JEXAMPLEKEY0000000000000B' }), localProof)
    );
    assert.equal(fresh.status, 200);
    const freshJson = await fresh.json();
    assert.notEqual(freshJson.deduplicated, true);
    assert.notEqual(freshJson.dispatchId, firstJson.dispatchId, 'a new key creates a new dispatch');
  }
);

// A delivery outage after the revenue-spine write must not multiply canonical
// records when the same idempotency key is retried after its claim lease.
await withEnv(
  {
    RESEND_API_KEY: '',
    DISPATCH_TO_EMAIL: '',
    FORMSPREE_ENDPOINT: ''
  },
  async () => {
    resetCanonicalStore();
    const store = getCanonicalStore();
    const key = '01JEXAMPLEKEY0000000000000D';
    const headers = { 'x-real-ip': '203.0.113.22' };

    const first = await dispatchApiPost(formRequest(dispatchForm({ idempotencyKey: key }), headers));
    assert.equal(first.status, 503);
    const claim = await store.getRecord('dispatch_submission', key);
    assert.equal(claim?.status, 'processing');

    await store.executeWrites([{
      table: 'dispatch_submission',
      id: key,
      action: 'upsert',
      record: { claimed_at_ms: Date.now() - 6 * 60_000 }
    }]);

    const leadsBefore = await store.queryTable('leads', 1000);
    const opportunitiesBefore = await store.queryTable('opportunities', 1000);
    const retry = await dispatchApiPost(formRequest(dispatchForm({ idempotencyKey: key }), headers));
    assert.equal(retry.status, 503);

    const leadsAfter = await store.queryTable('leads', 1000);
    const opportunitiesAfter = await store.queryTable('opportunities', 1000);
    assert.equal(leadsAfter.length, leadsBefore.length, 'retried intake must not duplicate leads');
    assert.equal(opportunitiesAfter.length, opportunitiesBefore.length, 'retried intake must not duplicate opportunities');
    assert.deepEqual(leadsAfter.map((record) => record.id), leadsBefore.map((record) => record.id));
    assert.deepEqual(opportunitiesAfter.map((record) => record.id), opportunitiesBefore.map((record) => record.id));
  }
);
resetCanonicalStore();

// Ambiguous delivery failure: the key settles 'done' so a replay cannot send a
// possibly-already-sent dispatch email twice. The lead is durable in the spine.
await withEnv(
  {
    RESEND_API_KEY: 'test',
    DISPATCH_TO_EMAIL: 'dispatch@example.com',
    FORMSPREE_ENDPOINT: ''
  },
  async () => {
    const key = '01JEXAMPLEKEY0000000000000C';
    const headers = { 'x-real-ip': '203.0.113.21' };
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: 'down' }), { status: 500 });
    };
    try {
      const first = await dispatchApiPost(formRequest(dispatchForm({ idempotencyKey: key }), headers));
      assert.equal(first.status, 502);
      const retry = await dispatchApiPost(formRequest(dispatchForm({ idempotencyKey: key }), headers));
      assert.equal(retry.status, 200, 'replay of an ambiguous failure dedupes instead of resending');
      const retryJson = await retry.json();
      assert.equal(retryJson.deduplicated, true);
      assert.equal(calls, 2, 'provider is never hit a second time for the same intent');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);
