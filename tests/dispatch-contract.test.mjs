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
    email: 'test@alreadyherellc.invalid',
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
    DISPATCH_TO_EMAIL: 'dispatch@alreadyherellc.invalid',
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
    FORMSPREE_ENDPOINT: 'https://alreadyherellc.invalid/formspree'
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
  }
);
