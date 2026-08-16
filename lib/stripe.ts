import Stripe from 'stripe';

export const STRIPE_API_VERSION = '2026-06-24.dahlia' as const;

export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION })
  : null;

export const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export function liveStripeClient(): Stripe {
  if (!stripe) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to process payments.');
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set; frontend payment buttons may not initialize.');
  }
  return stripe;
}

export function isLiveMode(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
}
