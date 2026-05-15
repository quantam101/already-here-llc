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
    assert.equal(json.records, 'dispatch_email_json_attachment');
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
    assert.equal(json.records, 'formspree_payload');
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
    assert.equal(response.status, 500);
    const json = await response.json();
    assert.equal(json.message, 'Dispatch endpoint not configured.');
  }
);

await withEnv(
  {
    RESEND_API_KEY: 'test',
    DISPATCH_TO_EMAIL: 'dispatch@example.com',
    FORMSPREE_ENDPOINT: ''
  },
  async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];

    try {
      globalThis.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        calls.push({ url, init });
        assert.equal(url, 'https://api.resend.com/emails');
        return new Response(JSON.stringify({ id: `email_${calls.length}` }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-forwarded-for': '203.0.113.14' }));
      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.ok, true);
      assert.match(json.dispatchId, /^AH-/);
      assert.equal(json.recordLocation, 'dispatch_email_json_attachment');
      assert.equal(calls.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);

await withEnv(
  {
    RESEND_API_KEY: '',
    DISPATCH_TO_EMAIL: '',
    FORMSPREE_ENDPOINT: 'https://example.com/formspree'
  },
  async () => {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        assert.equal(url, 'https://example.com/formspree');
        assert.equal(init?.method, 'POST');
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const response = await dispatchApiPost(formRequest(dispatchForm(), { 'x-forwarded-for': '203.0.113.15' }));
      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.ok, true);
      assert.equal(json.recordLocation, 'formspree_payload');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);

console.log('dispatch contract + api tests passed');
