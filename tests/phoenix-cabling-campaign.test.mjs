import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resetCanonicalStore } from '../lib/canonical-store.ts';
import { GET as leadHealth, POST as leadPost } from '../app/api/phoenix-cabling-lead/route.ts';
import { GET as guideGet } from '../app/api/phoenix-cabling-guide/route.ts';

const api = 'https://www.alreadyherellc.com/api/phoenix-cabling-lead';

const health = await leadHealth();
assert.equal(health.status, 200);
const status = await health.json();
assert.equal(status.service, 'phoenix-cabling-lead');
assert.equal(typeof status.automatedMarketingEnabled, 'boolean');
assert.equal(status.smsEnabled, false);

const malformed = await leadPost(new Request(api, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-real-ip': 'proof-invalid-json' },
  body: '{this is broken JSON'
}));
assert.equal(malformed.status, 400);

const badOrigin = await leadPost(new Request(api, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://phishing.example', 'x-real-ip': 'proof-origin' },
  body: '{}'
}));
assert.equal(badOrigin.status, 403);

const invalidEmail = await leadPost(new Request(api, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-real-ip': 'proof-invalid-email' },
  body: JSON.stringify({
    fullName: 'QA Tester', company: 'Proof Company', email: 'not-an-email',
    siteZip: '85004', projectType: 'Network upgrade', projectStage: 'Planning',
    marketingConsent: false
  })
}));
assert.equal(invalidEmail.status, 400);

// In a test environment without mail credentials, valid intake must fail closed,
// never claim delivery or create an appointment.
function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

const prior = { resend: process.env.RESEND_API_KEY, to: process.env.DISPATCH_TO_EMAIL, formspree: process.env.FORMSPREE_ENDPOINT };
delete process.env.RESEND_API_KEY;
delete process.env.DISPATCH_TO_EMAIL;
delete process.env.FORMSPREE_ENDPOINT;
try {
  const valid = await leadPost(new Request(api, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': 'proof-no-config' },
    body: JSON.stringify({
      fullName: 'QA Tester', company: 'Proof Company', email: 'qa@example.com',
      siteZip: '85004', projectType: 'Network upgrade', projectStage: 'Planning',
      marketingConsent: false
    })
  }));
  assert.equal(valid.status, 503);
  assert.equal((await valid.json()).ok, undefined);
} finally {
  restoreEnv('RESEND_API_KEY', prior.resend);
  restoreEnv('DISPATCH_TO_EMAIL', prior.to);
  restoreEnv('FORMSPREE_ENDPOINT', prior.formspree);
}

const pdfResponse = await guideGet();
assert.equal(pdfResponse.status, 200);
assert.match(pdfResponse.headers.get('content-type') || '', /application\/pdf/);
const bytes = new Uint8Array(await pdfResponse.arrayBuffer());
assert(bytes.length > 2500);
assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), '%PDF-');

console.log('Phoenix cabling lead funnel contract tests passed.');


// Production regression: three distinct intake submissions, even concurrent,
// must create only ONE campaign enrollment for a consented email.
// Company-owned synthetic QA addresses must NEVER enter the nurture sequence.
{
  const dir = mkdtempSync(join(tmpdir(), 'ah-cabling-dedupe-'));
  const originals = Object.fromEntries([
    'CANONICAL_STORE_TYPE','CANONICAL_SQLITE_PATH','VERCEL',
    'RESEND_API_KEY','DISPATCH_TO_EMAIL','FORMSPREE_ENDPOINT'
  ].map(key => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  const events = [];
  const sent = [];
  try {
    process.env.CANONICAL_STORE_TYPE = 'sqlite';
    process.env.CANONICAL_SQLITE_PATH = join(dir, 'canonical.sqlite');
    process.env.RESEND_API_KEY = 'test-key';
    process.env.DISPATCH_TO_EMAIL = 'ops@example.test';
    delete process.env.VERCEL;
    delete process.env.FORMSPREE_ENDPOINT;
    resetCanonicalStore();

    globalThis.fetch = async (url, options = {}) => {
      const requestUrl = String(url);
      const payload = JSON.parse(String(options.body || '{}'));
      if (requestUrl.endsWith('/emails')) {
        sent.push(payload);
        return new Response(JSON.stringify({ id: 'synthetic-email' }), { status: 200 });
      }
      if (requestUrl.endsWith('/events/send')) {
        events.push({ payload, idempotencyKey: options.headers['Idempotency-Key'] });
        return new Response('{}', { status: payload.email === 'failed@example.test' ? 503 : 202 });
      }
      throw new Error('Unexpected network request: ' + requestUrl);
    };
    let requestNumber = 0;
    const submit = (email) => leadPost(new Request(api, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': 'dedupe-test-' + (++requestNumber) },
      body: JSON.stringify({
        fullName: 'Synthetic QA', company: 'Controlled Test', email,
        siteZip: '85004', projectType: 'Network upgrade', projectStage: 'Planning',
        marketingConsent: true, website: ''
      })
    }));

    const concurrent = await Promise.all([
      submit('repeat@example.test'), submit('REPEAT@example.test'), submit('repeat@example.test')
    ]);
    const responses = await Promise.all(concurrent.map(async r => {
      assert.equal(r.status, 201);
      return r.json();
    }));
    assert.equal(events.length, 1, 'multiple submissions must trigger exactly one nurture event');
    assert.equal(events[0].payload.email, 'repeat@example.test');
    assert.match(events[0].idempotencyKey, /^phoenix-cabling-optin\\/cabling_nurture_/);
    assert.equal(responses.filter(v => v.nurtureStatus === 'accepted').length, 1);
    assert.equal(responses.filter(v => v.nurtureStatus === 'already_claimed').length, 2);
    assert.equal(responses.every(v => v.receiptSent === true), true, 'guide receipts remain available');

    const internal = await submit('dispatch@alreadyherellc.com');
    const internalResult = await internal.json();
    assert.equal(internal.status, 201);
    assert.equal(internalResult.nurtureStatus, 'internal_suppressed');
    assert.equal(events.length, 1, 'synthetic internal address cannot trigger marketing');

    const failed = await submit('failed@example.test');
    assert.equal((await failed.json()).nurtureStatus, 'failed');
    const failedAgain = await submit('failed@example.test');
    assert.equal((await failedAgain.json()).nurtureStatus, 'already_claimed');
    assert.equal(events.filter(v => v.payload.email === 'failed@example.test').length, 1,
      'ambiguous or rejected provider event must not auto-retry');
    assert(sent.length >= 2, 'customer transactional receipt and owner routing remain active');
  } finally {
    globalThis.fetch = previousFetch;
    resetCanonicalStore();
    for (const [key, value] of Object.entries(originals)) restoreEnv(key, value);
    rmSync(dir, { recursive: true, force: true });
  }
}
