import { NextResponse } from 'next/server.js';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-07-29.dahlia' }) : null;
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
    const { rentalId, referralCode } = session.metadata ?? {};
    console.log('[stripe webhook] Payment completed', { rentalId, referralCode, amount: session.amount_total, sessionId: session.id });
    // TODO: mark rental as paid, trigger referral credit, send confirmation email/SMS
  }

  return NextResponse.json({ received: true });
}
