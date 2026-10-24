import { NextResponse } from 'next/server';
import type { Stripe } from 'stripe';
import { liveStripeClient } from '@/lib/stripe';
import { siteConfig } from '@/lib/site';

export const runtime = 'nodejs';

export interface CheckoutBody {
  mode?: 'payment' | 'subscription';
  amount?: number;
  priceId?: string;
  quantity?: number;
  productName?: string;
  description?: string;
  customerEmail?: string;
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
  let stripeClient: Stripe | null = null;
  try {
    stripeClient = liveStripeClient();
  } catch {
    return NextResponse.json({ message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to process payments.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as CheckoutBody;
  const {
    mode = 'payment',
    amount,
    priceId,
    quantity = 1,
    productName = 'Already Here service',
    description,
    customerEmail,
    successPath = '/thank-you?payment=success',
    cancelPath = '/',
    referralCode = '',
    metadata = {}
  } = body;

  if (!priceId) {
    if (amount === undefined || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: 'Invalid amount.' }, { status: 400 });
    }
  }

  // Browser-provided prices are not authoritative.
  const approvedPriceIds = (process.env.APPROVED_STRIPE_PRICE_IDS ?? '')
    .split(',').map((id) => id.trim()).filter(Boolean);
  if (!priceId || !approvedPriceIds.includes(priceId)) {
    return NextResponse.json({ message: 'Online checkout is unavailable for this offer. Request an approved quote.' }, { status: 403 });
  }
  if (mode !== 'payment' && mode !== 'subscription') {
    return NextResponse.json({ message: 'Invalid checkout mode.' }, { status: 400 });
  }
  if (!Number.isSafeInteger(quantity) || quantity !== 1) {
    return NextResponse.json({ message: 'Invalid quantity.' }, { status: 400 });
  }
  const parsedQuantity = 1;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alreadyherellc.com';
  const success_url = `${origin}${successPath}`;
  const cancel_url = `${origin}${cancelPath}`;

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = { price: priceId, quantity: parsedQuantity };

  try {
    const canonicalMetadata: Record<string, string> = {
      ...metadata,
      referralCode,
      businessName: siteConfig.name,
      stripeProfileHandle: siteConfig.stripeProfileHandle
    };

    const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      payment_method_types: ['card'],
      line_items: [lineItem],
      metadata: canonicalMetadata,
      success_url,
      cancel_url
    };

    if (mode === 'payment') {
      sessionCreateParams.payment_intent_data = { metadata: canonicalMetadata };
    } else {
      sessionCreateParams.subscription_data = { metadata: canonicalMetadata };
    }

    if (customerEmail) sessionCreateParams.customer_email = customerEmail;

    const session = await stripeClient.checkout.sessions.create(sessionCreateParams);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout session creation failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
