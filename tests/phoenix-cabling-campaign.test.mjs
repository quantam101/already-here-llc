import assert from 'node:assert/strict';
import { GET as leadHealth, POST as leadPost } from '../app/api/phoenix-cabling-lead/route.ts';
import { GET as guideGet } from '../app/api/phoenix-cabling-guide/route.ts';

const api = 'https://www.alreadyherellc.com/api/phoenix-cabling-lead';

const health = await leadHealth();
assert.equal(health.status, 200);
const status = await health.json();
assert.equal(status.service, 'phoenix-cabling-lead');
assert.equal(status.automatedMarketingEnabled, false);
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
  if (prior.resend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prior.resend;
  if (prior.to === undefined) delete process.env.DISPATCH_TO_EMAIL; else process.env.DISPATCH_TO_EMAIL = prior.to;
  if (prior.formspree === undefined) delete process.env.FORMSPREE_ENDPOINT; else process.env.FORMSPREE_ENDPOINT = prior.formspree;
}

const pdfResponse = await guideGet();
assert.equal(pdfResponse.status, 200);
assert.match(pdfResponse.headers.get('content-type') || '', /application\/pdf/);
const bytes = new Uint8Array(await pdfResponse.arrayBuffer());
assert(bytes.length > 2500);
assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), '%PDF-');

console.log('Phoenix cabling lead funnel contract tests passed.');
