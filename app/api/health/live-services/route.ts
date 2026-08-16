import { NextResponse } from 'next/server';
import { getCanonicalStore } from '@/lib/canonical-store';
import { ociHealthCheck } from '@/lib/oci-canonical-client';
import { isLiveMode, sanitizeStripeKey, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ServiceHealth {
  name: string;
  ok: boolean;
  mode?: 'live' | 'test' | 'unknown';
  status: string;
  message?: string;
  latencyMs?: number;
}

export async function GET() {
  const services: ServiceHealth[] = [];
  const now = new Date().toISOString();

  // Canonical store (local / SQLite / remote)
  const canonicalStart = performance.now();
  try {
    const store = getCanonicalStore();
    const sample = await store.queryTable('revenue_events', 1);
    services.push({
      name: 'canonical_store',
      ok: Array.isArray(sample),
      status: 'healthy',
      latencyMs: Math.round(performance.now() - canonicalStart)
    });
  } catch (err) {
    services.push({
      name: 'canonical_store',
      ok: false,
      status: 'degraded',
      message: err instanceof Error ? err.message : 'Canonical store query failed'
    });
  }

  // OCI canonical persistence
  const ociStart = performance.now();
  const ociHealth = await ociHealthCheck();
  if (ociHealth === undefined) {
    services.push({
      name: 'oci_canonical',
      ok: false,
      status: 'not_configured',
      message: 'Set OCI_CANONICAL_URL and OCI_CANONICAL_API_KEY to enable OCI persistence.'
    });
  } else {
    services.push({
      name: 'oci_canonical',
      ok: ociHealth.ok === true,
      status: ociHealth.ok === true ? 'healthy' : 'degraded',
      latencyMs: Math.round(performance.now() - ociStart)
    });
  }

  // Stripe
  const stripeStart = performance.now();
  const keyHint = process.env.STRIPE_SECRET_KEY;
  const { mode, last4 } = sanitizeStripeKey(keyHint);
  if (!stripe) {
    services.push({
      name: 'stripe',
      ok: false,
      mode: 'unknown',
      status: 'not_configured',
      message: 'Set STRIPE_SECRET_KEY to enable Stripe payments.'
    });
  } else {
    try {
      await stripe.balance.retrieve();
      services.push({
        name: 'stripe',
        ok: true,
        mode: isLiveMode() ? 'live' : 'test',
        status: 'healthy',
        latencyMs: Math.round(performance.now() - stripeStart)
      });
    } catch (err) {
      services.push({
        name: 'stripe',
        ok: false,
        mode: isLiveMode() ? 'live' : 'test',
        status: 'degraded',
        message: err instanceof Error ? err.message : 'Stripe API check failed'
      });
    }
  }

  const allOk = services.every((s) => s.ok);
  const body = {
    ok: allOk,
    timestamp: now,
    services,
    stripe: { mode, last4 },
    publishableKeySet: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ociConfigured: !!process.env.OCI_CANONICAL_URL && !!process.env.OCI_CANONICAL_API_KEY
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
