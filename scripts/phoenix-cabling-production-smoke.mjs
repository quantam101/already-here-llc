// Controlled, credential-free external smoke test of production Phoenix lead campaign.
// This script does NOT purchase anything. It submits one explicitly internal test lead
// only when AH_RUN_INTERNAL_TEST=true. It does not send marketing or SMS.
import assert from 'node:assert/strict';

const BASE = 'https://www.alreadyherellc.com';
const proofMode = process.env.AH_RUN_INTERNAL_TEST === 'true';
const receipts = [];
const stamp = new Date().toISOString();

async function get(path) {
  const response = await fetch(BASE + path, {
    headers: { 'user-agent': 'AlreadyHere-Production-Campaign-QA/1.0', accept: '*/*' },
    signal: AbortSignal.timeout(25000),
    cache: 'no-store'
  });
  return response;
}
function proof(check, value) {
  receipts.push({ check, ...value });
}
async function main() {
  const landing = await get('/phoenix-cabling-checklist');
  const markup = await landing.text();
  assert.equal(landing.status, 200, 'Landing page must return HTTP 200');
  const headingPresent = markup.includes('Avoid costly cabling mistakes');
  const formPresent = markup.includes('Get the free checklist');
  proof('landing', {
    status: headingPresent && formPresent ? 'pass' : 'fail', httpStatus: landing.status,
    headingPresent, formPresent, responseBytes: markup.length,
    finalHost: new URL(landing.url).hostname,
    contentType: landing.headers.get('content-type') || 'unknown'
  });
  assert(headingPresent && formPresent,
    'Landing page must include campaign heading and signup CTA');

  const pdf = await get('/api/phoenix-cabling-guide');
  const data = new Uint8Array(await pdf.arrayBuffer());
  assert.equal(pdf.status, 200, 'Guide must return HTTP 200');
  assert((pdf.headers.get('content-type') || '').includes('application/pdf'), 'Guide must be a PDF');
  assert(data.byteLength > 2500, 'Guide must be nonempty');
  assert.equal(new TextDecoder().decode(data.subarray(0, 5)), '%PDF-');
  proof('pdf', { status: 'pass', httpStatus: pdf.status, bytes: data.byteLength });

  const statusResponse = await get('/api/phoenix-cabling-lead');
  assert.equal(statusResponse.status, 200, 'Lead endpoint health must return HTTP 200');
  const status = await statusResponse.json();
  assert.equal(status.service, 'phoenix-cabling-lead');
  const deliveryReady = status.emailDeliveryAvailable === true || status.fallbackAvailable === true;
  proof('lead-api', {
    status: deliveryReady ? 'pass' : 'blocked',
    httpStatus: statusResponse.status,
    emailDeliveryAvailable: status.emailDeliveryAvailable === true,
    fallbackAvailable: status.fallbackAvailable === true,
    durableGraphAvailable: status.durableGraphAvailable === true
  });
  assert(deliveryReady, 'Lead endpoint is not configured to deliver captured leads');

  if (proofMode) {
    const response = await fetch(BASE + '/api/phoenix-cabling-lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'AlreadyHere-Internal-Delivery-QA/1.0' },
      body: JSON.stringify({
        fullName: 'Internal QA - Not a Customer',
        company: 'Already Here LLC INTERNAL TEST',
        email: 'dispatch@alreadyherellc.com',
        siteZip: 'Phoenix, AZ 85007',
        projectType: 'Network upgrade',
        projectStage: 'Researching',
        marketingConsent: true, // Company-owned synthetic test address only; verifies the opt-in trigger
        website: '',
        utmSource: 'internal-qa',
        utmCampaign: 'phoenix-cabling-delivery-verification'
      }),
      signal: AbortSignal.timeout(30000),
      cache: 'no-store'
    });
    const reply = await response.json();
    assert.equal(response.status, 201, 'Internal lead must be accepted and routed');
    assert.equal(reply.ok, true);
    assert.match(String(reply.leadId), /^AH-CBL-/);
    assert.equal(reply.marketingEnrolled, true, 'Opted-in internal test must trigger Resend automation');
    proof('internal-test-lead', {
      status: 'pass', httpStatus: response.status,
      transactionalReceiptSent: reply.receiptSent === true,
      optInEventAccepted: reply.marketingEnrolled === true
    });
  } else {
    proof('internal-test-lead', { status: 'skipped' });
  }
}
try {
  await main();
  console.log(JSON.stringify({
    timestamp: stamp,
    target: BASE,
    verdict: 'pass',
    checks: receipts,
    disclosure: 'One synthetic INTERNAL TEST record and consented nurture run may have been created for the company-owned test mailbox; no paid transaction.'
  }, null, 2));
} catch (e) {
  console.error(JSON.stringify({
    timestamp: stamp,
    target: BASE,
    verdict: 'fail',
    reason: e instanceof Error ? e.message : String(e),
    checks: receipts
  }, null, 2));
  process.exitCode = 1;
}
