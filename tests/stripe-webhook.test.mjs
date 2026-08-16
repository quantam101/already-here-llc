import assert from 'assert';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';
import Stripe from 'stripe';

const secret = 'whsec_test_secret_12345678901234567890';
process.env.STRIPE_SECRET_KEY = 'sk_test_12345678901234567890';
process.env.STRIPE_WEBHOOK_SECRET = secret;

resetCanonicalStore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' });

const payload = JSON.stringify({
  id: 'evt_test_1',
  object: 'event',
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

console.log('stripe webhook tests passed');
