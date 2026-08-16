import { NextResponse } from 'next/server.js';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' }) : null;

export interface CheckoutBody {
  mode?: 'payment' | 'subscription';
  amount?: number;
  productName?: string;
  description?: string;
  successPath?: string;
  cancelPath?: string;
  referralCode?: string;
  metadata?: Record<string, string>;
}

function originFrom(request: Request): string {
  const header = request.headers.get('origin');
  if (header) return header;
  const host = request.headers.get('host');
  if (host) return `https://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alreadyherellc.com';
}

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to process payments.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as CheckoutBody;
  const {
    mode = 'payment',
    amount = 30500,
    productName = 'Already Here service',
    description = '',
    successPath = '/dashboard/payments?success=true',
    cancelPath = '/',
    referralCode = '',
    metadata = {}
  } = body;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ message: 'Invalid amount.' }, { status: 400 });
  }

  const origin = originFrom(request);
  const success_url = `${origin}${successPath}`;
  const cancel_url = `${origin}${cancelPath}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: productName, description },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      metadata: {
        referralCode,
        ...metadata
      },
      success_url,
      cancel_url
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout session creation failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
