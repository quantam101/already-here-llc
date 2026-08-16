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

export function sanitizeStripeKey(hint?: string): { mode: 'live' | 'test' | 'unknown'; last4: string } {
  if (!hint) return { mode: 'unknown', last4: '' };
  if (hint.startsWith('sk_live_')) return { mode: 'live', last4: hint.slice(-4) };
  if (hint.startsWith('sk_test_')) return { mode: 'test', last4: hint.slice(-4) };
  return { mode: 'unknown', last4: hint.slice(-4) };
}
