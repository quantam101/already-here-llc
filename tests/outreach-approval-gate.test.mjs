import assert from 'node:assert/strict';

process.env.AHFOS_INTERNAL_API_KEY = 'test-internal-key';
process.env.CANONICAL_STORE_TYPE = 'memory';

const { POST } = await import('../app/api/outreach/route.ts');

function outreachBody(overrides = {}) {
  return {
    source: 'test_outreach',
    channel: 'email',
    fullName: 'Gate Test',
    company: 'Gate Co',
    email: 'gate@example.com',
    messageType: 'intro_email',
    offer: 'Smart Hands',
    ...overrides
  };
}

function post(body, headers = {}) {
  return new Request('http://localhost/api/outreach', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.50', 'x-api-key': 'test-internal-key', ...headers },
    body: JSON.stringify(body)
  });
}

// The outreach queue contains private customer/prospect data, so even draft
// creation requires an internal credential or operator Basic auth.
{
  const response = await POST(new Request('http://localhost/api/outreach', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.50' },
    body: JSON.stringify(outreachBody({ status: 'draft' }))
  }));
  assert.equal(response.status, 401);
}

// approvals/policy.yaml: client_outreach/email_send always require approval.
// Approved internal callers may stage drafts but cannot assert outbound actions
// unless the separate outbound approval key is present.
{
  const response = await POST(post(outreachBody({ status: 'sent' })));
  assert.equal(response.status, 403);
  const json = await response.json();
  assert.equal(json.ok, false);
  assert.match(json.error, /approval/i);
}

for (const gated of ['sent', 'responded', 'meeting', 'proposal', 'won', 'lost', 'no_response', 'do_not_contact']) {
  const response = await POST(post(outreachBody({ status: gated })));
  assert.equal(response.status, 403, `${gated} requires approval`);
}

{
  const response = await POST(post(outreachBody({ status: 'sent' }), { 'x-internal-api-key': 'wrong-key' }));
  assert.equal(response.status, 403, 'wrong key rejected');
}

{
  const response = await POST(post(outreachBody({ status: 'sent' }), { 'x-internal-api-key': 'test-internal-key' }));
  assert.equal(response.status, 200, 'approved internal caller may record sent');
  const json = await response.json();
  assert.equal(json.ok, true);
}

{
  const response = await POST(post(outreachBody({ status: 'draft' })));
  assert.equal(response.status, 200, 'draft intake stays open to unauthenticated callers');
}

{
  const response = await POST(post(outreachBody({ status: 'ready' })));
  assert.equal(response.status, 200, 'ready intake stays open to unauthenticated callers');
}

console.log('outreach approval gate tests passed');
