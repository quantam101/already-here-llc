import { NextResponse } from 'next/server.js';
import Stripe from 'stripe';
import { canonicalId } from '@/lib/canonical-ids';
import { getCanonicalStore } from '@/lib/canonical-store';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' }) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ message: 'Stripe webhook not configured.' }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature.';
    return NextResponse.json({ message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { referralCode, ...metadata } = session.metadata ?? {};
    const now = new Date().toISOString();

    const revenueId = canonicalId(
      'revenue',
      session.id,
      String(session.customer_email ?? 'unknown'),
      now
    );

    const store = getCanonicalStore();
    await store.executeWrites([
      {
        table: 'revenue_events',
        id: revenueId,
        action: 'insert',
        record: {
          id: revenueId,
          source: 'stripe_checkout',
          channel: 'stripe',
          event_type: event.type,
          session_id: session.id,
          customer_email: session.customer_email ?? null,
          customer_name: session.customer_details?.name ?? null,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? 'usd',
          payment_status: session.payment_status,
          status: 'collected',
          referral_code: referralCode ?? null,
          metadata: JSON.stringify(metadata),
          created_at: now,
          updated_at: now,
        },
      },
    ]);

    console.log('[stripe webhook] Revenue recorded', {
      revenueId,
      sessionId: session.id,
      amountCents: session.amount_total,
      referralCode
    });
  }

  return NextResponse.json({ received: true });
}
