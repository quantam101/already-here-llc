import assert from 'node:assert/strict';
import {
  decideRoute,
  isAuthorizedBasic,
  PROTECTED_PREFIXES,
  RETIRED_ROUTES
} from '../lib/route-policy.ts';

// Encode credentials the way browsers do with charset="UTF-8": UTF-8 bytes, then base64.
const basic = (user, password) =>
  `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(`${user}:${password}`)))}`;

// Internal operator pages are protected, including sub-paths, trailing slashes and case.
for (const path of [
  '/command-center',
  '/command-center/costs',
  '/admin',
  '/dashboard',
  '/dashboard/payments',
  '/revenue-command',
  '/daily-command',
  '/revenue-mesh',
  '/followups',
  '/outreach',
  '/profitengine',
  '/network',
  '/Dashboard/',
  '/command-center/'
]) {
  assert.deepEqual(decideRoute(path), { kind: 'protected' }, `${path} should be protected`);
}

// Off-brand offers redirect to on-brand pages.
assert.deepEqual(decideRoute('/scooter-rentals'), { kind: 'retired', to: '/' });
assert.deepEqual(decideRoute('/scooter-rentals/terms'), { kind: 'retired', to: '/' });
assert.deepEqual(decideRoute('/ginc/join'), { kind: 'retired', to: '/' });
assert.deepEqual(decideRoute('/connect'), { kind: 'retired', to: '/technician-network' });
assert.deepEqual(decideRoute('/autoworks'), { kind: 'retired', to: '/services' });
assert.deepEqual(decideRoute('/ai-agent-ebook'), { kind: 'retired', to: '/ai-agent' });

// Public pages, look-alike prefixes, and API routes are untouched.
for (const path of [
  '/',
  '/dispatch',
  '/services',
  '/ai-agent',
  '/technician-network',
  '/passport/abc123',
  '/dashboarding',
  '/networking-tips',
  '/api/revenue-mesh',
  '/api/dashboard',
  '/thank-you'
]) {
  assert.deepEqual(decideRoute(path), { kind: 'public' }, `${path} should stay public`);
}

// Every redirect target is itself public (no redirect loops, no redirect into a locked page).
for (const route of RETIRED_ROUTES) {
  assert.equal(decideRoute(route.to).kind, 'public', `${route.prefix} -> ${route.to} must land on a public page`);
}
// No prefix is both protected and retired.
for (const route of RETIRED_ROUTES) {
  assert.ok(!PROTECTED_PREFIXES.includes(route.prefix), `${route.prefix} is listed twice`);
}

// Basic auth.
assert.equal(isAuthorizedBasic(basic('ops', 's3cret:with:colons'), 'ops', 's3cret:with:colons'), true);
assert.equal(isAuthorizedBasic(basic('ops', 'wrong'), 'ops', 's3cret'), false);
assert.equal(isAuthorizedBasic(basic('admin', 's3cret'), 'ops', 's3cret'), false);
assert.equal(isAuthorizedBasic(basic('ops', 's3cret'), 'ops', ''), false, 'empty configured password never authorizes');
assert.equal(isAuthorizedBasic(null, 'ops', 's3cret'), false);
assert.equal(isAuthorizedBasic('Bearer abc', 'ops', 's3cret'), false);
assert.equal(isAuthorizedBasic('Basic !!!not-base64', 'ops', 's3cret'), false);
assert.equal(isAuthorizedBasic(`Basic ${btoa('no-colon')}`, 'ops', 's3cret'), false);
// Non-ASCII passwords (UTF-8 credentials) authorize when they match, and only then.
assert.equal(isAuthorizedBasic(basic('ops', 'päss'), 'ops', 'päss'), true);
assert.equal(isAuthorizedBasic(basic('ops', 'pass🔑'), 'ops', 'pass🔑'), true);
assert.equal(isAuthorizedBasic(basic('ops', 'pass'), 'ops', 'päss'), false);
// Bytes that are not valid UTF-8 are rejected rather than mis-decoded.
assert.equal(isAuthorizedBasic(`Basic ${btoa('ops:\xff\xfe')}`, 'ops', 'ÿþ'), false);

console.log('route-policy: all assertions passed');
