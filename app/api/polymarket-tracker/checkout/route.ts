import { NextResponse } from 'next/server.js';
import Stripe from 'stripe';
import { polymarketPlans } from '@/lib/polymarket-products';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' }) : null;

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to process payments.' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { planId?: string; email?: string; referralCode?: string };
    const { planId, email, referralCode } = body;

    const plan = polymarketPlans.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ message: 'Invalid plan.' }, { status: 400 });
    }

    if (plan.cents === 0) {
      return NextResponse.json({ message: 'Free plan does not require checkout.' }, { status: 400 });
    }

    const origin = request.headers.get('origin') ?? 'https://www.alreadyherellc.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Polymarket Tracker — ${plan.name}` },
            recurring: { interval: 'month' },
            unit_amount: plan.cents
          },
          quantity: 1
        }
      ],
      metadata: { planId: plan.id, referralCode: referralCode ?? '' },
      success_url: `${origin}/dashboard/polymarket-tracker?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/polymarket-tracker`
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout session creation failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
