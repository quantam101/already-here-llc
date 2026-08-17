import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' }) : null;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ message: 'Stripe is not configured.' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { customerId?: string; sessionId?: string };
    const { customerId, sessionId } = body;

    let customer: string | undefined = customerId;
    if (!customer && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      customer = session.customer as string | undefined;
    }

    if (!customer) {
      return NextResponse.json({ message: 'Customer or session ID required.' }, { status: 400 });
    }

    const origin = request.headers.get('origin') ?? 'https://www.alreadyherellc.com';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${origin}/dashboard/polymarket-tracker`
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Billing portal creation failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
