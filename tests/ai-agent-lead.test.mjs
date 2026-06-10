import assert from 'node:assert/strict';
import { GET as leadApiGet, POST as leadApiPost } from '../app/api/ai-agent-lead/route.ts';
import { scoreAgentLead } from '../lib/ai-agent-products.ts';

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

function payload(overrides = {}) {
  return {
    fullName: 'Taylor Owner',
    company: 'Phoenix Service Company',
    email: 'owner@example.com',
    phone: '602-555-0100',
    website: 'https://example.com',
    businessType: 'Local service business',
    packageInterest: 'Growth Agent',
    urgency: 'This week',
    budget: '$2,500 - $5,000',
    preferredLanguage: 'English',
    additionalLanguages: '',
    languageMode: 'Auto-detect visitor language and respond in that language',
    goals: 'Capture visitors, qualify quote requests, route hot opportunities, and improve follow-up.',
    currentLeadProblem: 'Quote requests are not followed up quickly enough.',
    sourcePath: '/ai-agent',
    ...overrides
  };
}

function request(body, ip = '203.0.113.90') {
  return new Request('http://localhost/api/ai-agent-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

{
  const result = scoreAgentLead(payload());
  assert.equal(result.grade, 'A');
  assert.ok(result.score >= 76);
}

await withEnv({ RESEND_API_KEY: 'test', AI_AGENT_TO_EMAIL: 'agent@example.com', DISPATCH_TO_EMAIL: '', FORMSPREE_ENDPOINT: '' }, async () => {
  const response = await leadApiGet();
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.delivery, 'resend');
  assert.equal(json.records, 'lead_email_json_attachment');
});

{
  const response = await leadApiPost(request({}, '203.0.113.91'));
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.message, 'Missing required field: fullName');
}

{
  const response = await leadApiPost(request(payload({ email: 'invalid' }), '203.0.113.92'));
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.message, 'Invalid email address.');
}

await withEnv({ RESEND_API_KEY: '', AI_AGENT_TO_EMAIL: '', DISPATCH_TO_EMAIL: '', FORMSPREE_ENDPOINT: '' }, async () => {
  const response = await leadApiPost(request(payload(), '203.0.113.93'));
  assert.equal(response.status, 500);
  const json = await response.json();
  assert.equal(json.message, 'AI agent lead endpoint not configured.');
});

await withEnv({ RESEND_API_KEY: 'test', AI_AGENT_TO_EMAIL: 'agent@example.com', DISPATCH_TO_EMAIL: '', FORMSPREE_ENDPOINT: '' }, async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      calls.push(url);
      assert.equal(url, 'https://api.resend.com/emails');
      return new Response(JSON.stringify({ id: `email_${calls.length}` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const response = await leadApiPost(request(payload(), '203.0.113.94'));
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);
    assert.match(json.leadId, /^AIA-/);
    assert.equal(json.grade, 'A');
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

console.log('ai agent lead tests passed');
