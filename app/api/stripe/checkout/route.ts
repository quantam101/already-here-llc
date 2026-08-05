import { NextResponse } from 'next/server.js';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-07-29.dahlia' }) : null;

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to process payments.' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { mode?: 'payment' | 'subscription'; amount?: number; rentalId?: string; referralCode?: string };
    const { mode = 'payment', amount = 30500, rentalId, referralCode } = body;

    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: mode === 'subscription' ? 'Scooter rental — weekly' : 'Scooter rental onboarding' },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      metadata: { rentalId: rentalId ?? '', referralCode: referralCode ?? '' },
      success_url: `${request.headers.get('origin') ?? 'https://www.alreadyherellc.com'}/dashboard/payments?success=true`,
      cancel_url: `${request.headers.get('origin') ?? 'https://www.alreadyherellc.com'}/scooter-rentals`
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout session creation failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
