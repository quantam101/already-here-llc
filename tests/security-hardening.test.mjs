import assert from 'node:assert/strict';

process.env.STRIPE_SECRET_KEY = 'sk_test_security_hardening';
process.env.APPROVED_STRIPE_PRICE_IDS = 'price_approved_test';
process.env.AHFOS_INTERNAL_API_KEY = 'internal-test-key';
process.env.OPS_PORTAL_PASSWORD = 'ops-test-password';

const { contentSecurityPolicy } = await import('../lib/security-headers.ts');
const { isInternalAuthorized } = await import('../lib/internal-auth.ts');
const { resetRateLimitsForTests, trustedClientKey } = await import('../lib/request-security.ts');
const { stripe } = await import('../lib/stripe.ts');
const { POST: checkoutPost } = await import('../app/api/stripe/checkout/route.ts');

// CSP: development keeps eval for React diagnostics; production removes it.
assert.match(contentSecurityPolicy('development'), /unsafe-eval/);
assert.doesNotMatch(contentSecurityPolicy('production'), /unsafe-eval/);
assert.match(contentSecurityPolicy('production'), /upgrade-insecure-requests/);
assert.match(contentSecurityPolicy('production'), /object-src 'none'/);

// Client identity: proxy-owned Vercel headers win; client-supplied XFF is
// ignored in production but remains available for local development/tests.
const spoofed = new Request('http://localhost/test', {
  headers: {
    'x-forwarded-for': '198.51.100.10',
    'x-real-ip': '203.0.113.20',
    'x-vercel-forwarded-for': '192.0.2.30'
  }
});
assert.equal(trustedClientKey(spoofed), '203.0.113.20');
process.env.VERCEL = '1';
assert.equal(trustedClientKey(spoofed), '192.0.2.30');
process.env.VERCEL = '';
const previousNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
assert.equal(trustedClientKey(new Request('http://localhost/test', { headers: { 'x-forwarded-for': '198.51.100.10' } })), 'unknown');
process.env.NODE_ENV = 'test';
assert.equal(trustedClientKey(new Request('http://localhost/test', { headers: { 'x-forwarded-for': '198.51.100.10' } })), '198.51.100.10');
process.env.NODE_ENV = previousNodeEnv;

// Internal auth accepts server-to-server keys and operator Basic credentials,
// while missing/wrong credentials fail closed.
assert.equal(isInternalAuthorized(new Request('http://localhost/internal')), false);
assert.equal(isInternalAuthorized(new Request('http://localhost/internal', { headers: { 'x-api-key': 'internal-test-key' } })), true);
const basic = `Basic ${btoa('ops:ops-test-password')}`;
assert.equal(isInternalAuthorized(new Request('http://localhost/internal', { headers: { authorization: basic } })), true);
assert.equal(isInternalAuthorized(new Request('http://localhost/internal', { headers: { authorization: basic, origin: 'https://evil.example' } })), false);
assert.equal(isInternalAuthorized(new Request('http://localhost/internal', { headers: { authorization: basic, 'sec-fetch-site': 'cross-site' } })), false);
assert.equal(isInternalAuthorized(new Request('http://localhost/internal', { headers: { authorization: basic, origin: 'http://localhost', 'sec-fetch-site': 'same-origin' } })), true);
assert.equal(isInternalAuthorized(new Request('http://localhost/internal', { headers: { authorization: `Basic ${btoa('ops:wrong')}` } })), false);

function checkoutRequest(body, headers = {}) {
  return new Request('http://localhost:3000/api/stripe/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

const validCheckout = {
  mode: 'payment',
  priceId: 'price_approved_test',
  quantity: 1,
  checkoutIntentId: 'intent-test-001',
  successPath: '/thank-you?payment=success',
  cancelPath: '/',
  referralCode: 'AH-ABC123',
  metadata: { leadId: 'lead-1', admin: 'must-not-pass' }
};

resetRateLimitsForTests();
assert.equal((await checkoutPost(new Request('http://localhost:3000/api/stripe/checkout', { method: 'POST', body: '{}' }))).status, 415);
assert.equal((await checkoutPost(checkoutRequest(validCheckout, { origin: 'https://evil.example' }))).status, 403);
assert.equal((await checkoutPost(checkoutRequest({ ...validCheckout, successPath: 'https://evil.example' }))).status, 400);
assert.equal((await checkoutPost(checkoutRequest({ ...validCheckout, referralCode: 'bad-code' }))).status, 400);
assert.equal((await checkoutPost(checkoutRequest({ ...validCheckout, priceId: 'price_browser_supplied' }))).status, 403);

const calls = [];
stripe.checkout.sessions.create = async (params, options) => {
  calls.push({ params, options });
  return { id: 'cs_test_hardened', url: 'https://checkout.stripe.test/session' };
};

const success = await checkoutPost(checkoutRequest(validCheckout));
assert.equal(success.status, 200);
assert.deepEqual(await success.json(), { url: 'https://checkout.stripe.test/session', sessionId: 'cs_test_hardened' });
assert.equal(calls.length, 1);
assert.equal(calls[0].options.idempotencyKey, 'already-here-checkout-intent-test-001');
assert.equal(calls[0].options.timeout, 10_000);
assert.equal(calls[0].params.metadata.leadId, 'lead-1');
assert.equal(calls[0].params.metadata.admin, undefined);
assert.equal(calls[0].params.metadata.referralCode, 'AH-ABC123');

console.log('security hardening tests passed');
