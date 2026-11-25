import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { Stripe } from 'stripe';
import { liveStripeClient } from '@/lib/stripe';
import { siteConfig } from '@/lib/site';
import { isValidReferralCode } from '@/lib/referral';
import { rateLimitExceeded, trustedClientKey } from '@/lib/request-security';

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
  checkoutIntentId?: string;
  metadata?: Record<string, string>;
}

const CLIENT_METADATA_ALLOWLIST = new Set(['rentalId', 'leadId', 'dispatchId', 'source', 'campaign', 'utm_source', 'utm_medium', 'utm_campaign']);
const MAX_BODY_BYTES = 8_000;
const CHECKOUT_RATE_LIMIT_MAX = 10;
const CHECKOUT_RATE_LIMIT_WINDOW_MS = 60_000;
const STRIPE_REQUEST_TIMEOUT_MS = 10_000;
const INTENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{7,119}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function isValidPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && path.length <= 240 && !/[\u0000-\u001f\u007f]/.test(path);
}

function normalizeIntentId(value: unknown): string | null {
  return typeof value === 'string' && INTENT_ID_PATTERN.test(value) ? value : null;
}

function parseCheckoutBody(rawText: string): CheckoutBody | null {
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as CheckoutBody;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return jsonResponse({ message: 'Expected JSON.' }, 415);
  }

  const originHeader = request.headers.get('origin');
  if (originHeader && originHeader !== new URL(request.url).origin) {
    return jsonResponse({ message: 'Invalid request origin.' }, 403);
  }

  if (await rateLimitExceeded({
    scope: 'stripe-checkout',
    key: trustedClientKey(request),
    maxRequests: CHECKOUT_RATE_LIMIT_MAX,
    windowMs: CHECKOUT_RATE_LIMIT_WINDOW_MS
  })) {
    return jsonResponse({ message: 'Too many checkout attempts. Try again later.' }, 429);
  }

  const rawText = await request.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return jsonResponse({ message: 'Request too large.' }, 413);
  }

  const body = parseCheckoutBody(rawText);
  if (!body) {
    return jsonResponse({ message: 'Invalid JSON payload.' }, 400);
  }

  let stripeClient: Stripe;
  try {
    stripeClient = liveStripeClient();
  } catch {
    return jsonResponse({ message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to process payments.' }, 503);
  }

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
    return jsonResponse({ message: 'Online checkout is unavailable for this offer. Request an approved quote.' }, 403);
  }
  if (mode !== 'payment' && mode !== 'subscription') {
    return jsonResponse({ message: 'Invalid checkout mode.' }, 400);
  }
  if (!Number.isSafeInteger(quantity) || quantity !== 1) {
    return jsonResponse({ message: 'Invalid quantity.' }, 400);
  }
  if (!isValidPath(successPath) || !isValidPath(cancelPath)) {
    return jsonResponse({ message: 'Invalid checkout return path.' }, 400);
  }
  if (customerEmail && (customerEmail.length > 160 || !EMAIL_PATTERN.test(customerEmail))) {
    return jsonResponse({ message: 'Invalid customer email.' }, 400);
  }
  if (referralCode && !isValidReferralCode(referralCode)) {
    return jsonResponse({ message: 'Invalid referral code.' }, 400);
  }

  const parsedQuantity = 1;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alreadyherellc.com';
  const success_url = `${origin}${successPath}`;
  const cancel_url = `${origin}${cancelPath}`;

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = { price: priceId, quantity: parsedQuantity };

  try {
    // Entitlement is defined by the approved Stripe price, never by browser-supplied metadata.
    const clientMetadata: Record<string, string> = {};
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      for (const [key, value] of Object.entries(metadata)) {
        if (CLIENT_METADATA_ALLOWLIST.has(key) && typeof value === 'string' && value.length <= 200) clientMetadata[key] = value;
      }
    }
    const canonicalMetadata: Record<string, string> = {
      ...clientMetadata,
      offer: priceId,
      priceId,
      referralCode,
      businessName: siteConfig.name,
      stripeProfileHandle: siteConfig.stripeProfileHandle
    };

    const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      allowed_payment_method_types: ['card'],
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

    // The browser mints one intent id for a checkout attempt and reuses it on
    // retry. Stripe then collapses network retries/double submissions instead
    // of creating multiple checkout sessions for the same purchase intent.
    const checkoutIntentId = normalizeIntentId(body.checkoutIntentId) ?? `server-${randomUUID()}`;
    const session = await stripeClient.checkout.sessions.create(sessionCreateParams, {
      idempotencyKey: `already-here-checkout-${checkoutIntentId}`,
      timeout: STRIPE_REQUEST_TIMEOUT_MS
    });
    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout session creation failed', error);
    return jsonResponse({ message: 'Checkout session creation failed. Please try again or request a manual invoice.' }, 502);
  }
}
