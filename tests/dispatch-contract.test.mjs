import assert from 'node:assert/strict';
import { GET as dispatchApiGet, POST as dispatchApiPost } from '../app/api/dispatch/route.ts';

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
  const response = await dispatchApiPost(formRequest(new FormData(), { 'x-forwarded-for': '203.0.113.10' }));
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.message, 'Missing required field: fullName');
}

{
  const formData = dispatchForm({ website: 'bot' });
  const response = await dispatchApiPost(formRequest(formData, { 'x-forwarded-for': '203.0.113.11' }));
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.message, 'Submission rejected.');
}

{
  const formData = dispatchForm({ email: 'not-an-email' });
  const response = await dispatchApiPost(formRequest(formData, { 'x-forwarded-for': '203.0.113.12' }));
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
    const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-forwarded-for': '203.0.113.13' }));
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(json.delivery, 'local_proof_only');
    assert.equal(json.recordLocation, 'revenue_command_spine_local_proof');
    assert.equal(json.persistedExternally, false);
    assert.ok(json.dispatchId);
    assert.ok(json.revenueSpine);
    assert.equal(json.triage.primaryLane, 'emergency_onsite');
    assert.equal(json.triage.urgencyScore, 95);
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
    globalThis.fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('api.resend.com')) {
        return new Response(JSON.stringify({ message: 'resend down' }), { status: 500 });
      }
      if (url.includes('formspree')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    };
    try {
      const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-forwarded-for': '203.0.113.14' }));
      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.ok, true);
      assert.equal(json.delivery, 'formspree');
      assert.equal(json.failoverUsed, true);
      assert.equal(json.persistedExternally, true);
      assert.equal(calls.filter((u) => u.includes('api.resend.com')).length, 2, 'resend attempted twice before failover');
      assert.equal(calls.filter((u) => u.includes('formspree')).length, 1);
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
      const url = String(input);
      if (url.includes('api.resend.com')) {
        resendCalls += 1;
        if (resendCalls === 1) return new Response(JSON.stringify({ message: 'transient' }), { status: 500 });
        return new Response(JSON.stringify({ id: 'email-1' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    };
    try {
      const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-forwarded-for': '203.0.113.15' }));
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
      const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-forwarded-for': '203.0.113.16' }));
      assert.equal(response.status, 502);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);
