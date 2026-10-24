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
    priceId,
    quantity = 1,
    customerEmail,
    successPath = '/thank-you?payment=success',
    cancelPath = '/',
    referralCode = '',
    metadata = {}
  } = body;

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
