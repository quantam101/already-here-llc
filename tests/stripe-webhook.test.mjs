import assert from 'assert';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';
import Stripe from 'stripe';

const secret = 'whsec_test_secret_12345678901234567890';
process.env.STRIPE_SECRET_KEY = 'sk_test_12345678901234567890';
process.env.STRIPE_WEBHOOK_SECRET = secret;

process.env.CANONICAL_STORE_TYPE = 'sqlite';
process.env.CANONICAL_SQLITE_PATH = ':memory:';
resetCanonicalStore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-09-30.endive' });

const payload = JSON.stringify({
  id: 'evt_test_1',
  object: 'event',
  created: 1792850000,
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      object: 'checkout.session',
      amount_total: 14900,
      currency: 'usd',
      payment_status: 'paid',
      customer_email: 'buyer@example.invalid',
      customer_details: { name: 'Buyer Name' },
      metadata: { offer: 'field-operations-workflow-review', referralCode: 'partner1' }
    }
  }
});

const signature = stripe.webhooks.generateTestHeaderString({
  payload,
  secret,
  timestamp: Math.floor(Date.now() / 1000)
});

const { POST } = await import('../app/api/stripe/webhook/route.ts');
const request = new Request('http://localhost:3000/api/stripe/webhook', {
  method: 'POST',
  headers: { 'stripe-signature': signature },
  body: payload
});

const response = await POST(request);
const json = await response.json();
assert.equal(response.status, 200);
assert.equal(json.received, true);

const records = await getCanonicalStore().queryTable('revenue_events', 10);
assert.equal(records.length, 1);
assert.equal(records[0].amount_cents, 14900);
assert.equal(records[0].status, 'collected');
assert.equal(records[0].referral_code, 'partner1');

const replayResponse = await POST(new Request('http://localhost:3000/api/stripe/webhook', {
  method: 'POST',
  headers: { 'stripe-signature': signature },
  body: payload
}));
assert.equal(replayResponse.status, 200);
assert.equal((await replayResponse.json()).duplicate, true);
const afterReplay = await getCanonicalStore().queryTable('revenue_events', 10);
assert.equal(afterReplay.length, 1);
const eventRows = await getCanonicalStore().queryTable('stripe_events', 10);
assert.equal(eventRows[0].status, 'done');

const concurrent = await Promise.all(Array.from({ length: 10 }, () => POST(new Request('http://localhost:3000/api/stripe/webhook', {
  method: 'POST', headers: { 'stripe-signature': signature }, body: payload
}))));
assert.ok(concurrent.every(r => r.status === 200 || r.status === 409));
assert.equal((await getCanonicalStore().queryTable('revenue_events', 50)).length, 1);

// Referral: two paid events for one session => exactly one conversion and one totals increment.
{
  const { buildReferralCodeWrite } = await import('../lib/referral.ts');
  const code = 'AH-REF2T1';
  await getCanonicalStore().executeWrites([buildReferralCodeWrite({ code, ownerType: 'user', ownerId: 'user_ref_test', rewardCents: 2500, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' })]);
  const session = {
    id: 'cs_test_ref_1', object: 'checkout.session', amount_total: 14900, currency: 'usd', payment_status: 'paid',
    customer_email: 'ref@example.invalid', customer_details: { name: 'Ref Buyer' }, metadata: { referralCode: code }
  };
  const events = [
    { id: 'evt_ref_1', created: 1792850100, type: 'checkout.session.completed' },
    { id: 'evt_ref_2', created: 1792850200, type: 'checkout.session.async_payment_succeeded' }
  ];
  for (const evt of events) {
    const body = JSON.stringify({ ...evt, object: 'event', data: { object: session } });
    const sig = stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp: Math.floor(Date.now() / 1000) });
    const res = await POST(new Request('http://localhost:3000/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body }));
    assert.equal(res.status, 200);
  }
  const conversions = (await getCanonicalStore().queryTable('referral_conversions', 50)).filter((c) => c.referral_code === code);
  assert.equal(conversions.length, 1, 'one conversion per checkout session');
  assert.equal(conversions[0].revenue_cents, 14900);
  const codeRows = (await getCanonicalStore().queryTable('referral_codes', 50)).filter((c) => c.code === code);
  assert.equal(codeRows.length, 1);
  assert.equal(codeRows[0].conversions_count, 1, 'code totals incremented exactly once');
  assert.equal(codeRows[0].total_revenue_cents, 14900);
  assert.equal(codeRows[0].total_rewards_cents, 2500);
  const revenue = (await getCanonicalStore().queryTable('revenue_events', 50)).filter((r) => r.session_id === 'cs_test_ref_1');
  assert.equal(revenue.length, 1, 'revenue keyed by session id');
}

console.log('stripe webhook tests passed');
