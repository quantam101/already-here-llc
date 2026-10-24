import { NextResponse } from 'next/server';
import type { Stripe } from 'stripe';
import { canonicalId } from '@/lib/canonical-ids';
import { getCanonicalStore, isCanonicalStoreDurable } from '@/lib/canonical-store';
import { stripe, webhookSecret } from '@/lib/stripe';
import { buildReferralConversionWrite, getReferralCodeByCode, isValidReferralCode } from '@/lib/referral';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ message: 'Stripe webhook not configured.' }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature.';
    return NextResponse.json({ message }, { status: 400 });
  }

  if (!isCanonicalStoreDurable()) return NextResponse.json({ message: 'Durable ledger unavailable' }, { status: 503 });
  const store = getCanonicalStore();
  const now = new Date(event.created * 1000).toISOString();
  const eventKey = canonicalId('stripe_event', event.id);
  let claim: 'claimed' | 'done' | 'in_progress';
  try {
    claim = await store.claimEvent('stripe_events', eventKey, { source: 'stripe', event_id: event.id, event_type: event.type, created_at: now }, { leaseMs: 300000 });
  } catch {
    return NextResponse.json({ message: 'Atomic event claim unavailable' }, { status: 503 });
  }
  if (claim === 'done') return NextResponse.json({ received: true, duplicate: true });
  if (claim === 'in_progress') return NextResponse.json({ message: 'Event in progress' }, { status: 409 });
  try {

  async function recordConversionForCheckout(session: Stripe.Checkout.Session, sourceId: string) {
    const referralCode = session.metadata?.referralCode ?? '';
    if (!isValidReferralCode(referralCode)) return;

    const codeRecord = await getReferralCodeByCode(store, referralCode);
    if (!codeRecord || codeRecord.status !== 'active') return;

    const revenueCents = session.amount_total ?? 0;
    const rewardCents = codeRecord.reward_cents;
    const conversionWrite = buildReferralConversionWrite({
      code: referralCode,
      referredEmail: session.customer_email ?? undefined,
      referredName: session.customer_details?.name ?? undefined,
      eventType: 'checkout',
      sourceTable: 'revenue_events',
      sourceId,
      revenueCents,
      rewardCents,
      partnerId: codeRecord.owner_type === 'partner' ? codeRecord.owner_id : null,
      status: 'pending',
      createdAt: now
    }, codeRecord);
    if (await store.getRecord('referral_conversions', conversionWrite.id)) return;
    const result = await store.executeWrites([conversionWrite]);
    if (!result.ok) throw new Error('Referral write failed');
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid' && session.mode !== 'subscription') {
    const { referralCode, ...metadata } = session.metadata ?? {};

    const revenueId = canonicalId('revenue', session.id);

    const result = await store.executeWrites([
      {
        table: 'revenue_events',
        id: revenueId,
        action: 'upsert',
        record: {
          id: revenueId,
          source: 'stripe_checkout',
          channel: 'stripe',
          event_type: event.type,
          session_id: session.id,
          customer_email: session.customer_email ?? null,
          customer_name: session.customer_details?.name ?? null,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? 'usd',
          payment_status: session.payment_status,
          status: 'collected',
          referral_code: referralCode ?? null,
          metadata: JSON.stringify(metadata),
          created_at: now,
          updated_at: now
        }
      }
    ]);
    if (!result.ok) throw new Error('Checkout revenue write failed');

    if (referralCode) await recordConversionForCheckout(session, revenueId);

    console.log('[stripe webhook] Revenue recorded', {
      revenueId,
      sessionId: session.id,
      amountCents: session.amount_total,
      referralCode
    });
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const revenueId = canonicalId('revenue', invoice.id);

    const result = await store.executeWrites([
      {
        table: 'revenue_events',
        id: revenueId,
        action: 'upsert',
        record: {
          id: revenueId,
          source: 'stripe_invoice',
          channel: 'stripe',
          event_type: event.type,
          invoice_id: invoice.id,
          customer_email: invoice.customer_email ?? null,
          customer_name: invoice.customer_name ?? null,
          amount_cents: (invoice.amount_paid ?? invoice.total ?? 0),
          currency: invoice.currency ?? 'usd',
          payment_status: 'paid',
          status: 'collected',
          subscription_id: (invoice as unknown as { subscription?: string | null }).subscription ?? null,
          metadata: JSON.stringify({ number: invoice.number, hosted_invoice_url: invoice.hosted_invoice_url }),
          created_at: now,
          updated_at: now
        }
      }
    ]);
    if (!result.ok) throw new Error('Ledger write failed');

    console.log('[stripe webhook] Invoice paid recorded', { revenueId, invoiceId: invoice.id, amountCents: invoice.amount_paid });
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const revenueId = canonicalId('revenue', event.id);

    const result = await store.executeWrites([
      {
        table: 'revenue_events',
        id: revenueId,
        action: 'upsert',
        record: {
          id: revenueId,
          source: 'stripe_invoice',
          channel: 'stripe',
          event_type: event.type,
          invoice_id: invoice.id,
          customer_email: invoice.customer_email ?? null,
          amount_cents: (invoice.amount_due ?? invoice.total ?? 0),
          currency: invoice.currency ?? 'usd',
          payment_status: 'failed',
          status: 'failed',
          metadata: JSON.stringify({ number: invoice.number, attempt_count: invoice.attempt_count }),
          created_at: now,
          updated_at: now
        }
      }
    ]);
    if (!result.ok) throw new Error('Ledger write failed');

    console.log('[stripe webhook] Invoice payment failed recorded', { revenueId, invoiceId: invoice.id });
  }

  if (event.type === 'payout.paid') {
    const payout = event.data.object as Stripe.Payout;
    const payoutId = canonicalId('payout', payout.id);

    const result = await store.executeWrites([
      {
        table: 'payouts',
        id: payoutId,
        action: 'upsert',
        record: {
          id: payoutId,
          source: 'stripe_payout',
          channel: 'stripe',
          event_type: event.type,
          payout_id: payout.id,
          amount_cents: payout.amount ?? 0,
          currency: payout.currency ?? 'usd',
          status: payout.status ?? 'paid',
          arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
          bank_account_ending: payout.destination ? '***' : null,
          metadata: JSON.stringify({ method: payout.method, type: payout.type }),
          created_at: now,
          updated_at: now
        }
      }
    ]);
    if (!result.ok) throw new Error('Ledger write failed');

    console.log('[stripe webhook] Payout recorded', { payoutId, payoutIdStripe: payout.id, amountCents: payout.amount });
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const refund = charge.refunds?.data?.[0];
    if (refund) {
      const refundId = canonicalId('refund', refund.id);
      const result = await store.executeWrites([
        {
          table: 'refunds',
          id: refundId,
          action: 'upsert',
          record: {
            id: refundId,
            source: 'stripe_refund',
            channel: 'stripe',
            event_type: event.type,
            charge_id: charge.id,
            refund_id: refund.id,
            amount_cents: refund.amount ?? 0,
            currency: charge.currency ?? 'usd',
            status: refund.status ?? 'succeeded',
            reason: refund.reason ?? null,
            created_at: now,
            updated_at: now
          }
        }
      ]);
      if (!refundResult.ok) throw new Error('Refund write failed');

      console.log('[stripe webhook] Refund recorded', { refundId, refundIdStripe: refund.id, amountCents: refund.amount });
    }
  }

  const processed = await store.executeWrites([{ table: 'stripe_events', id: eventKey, action: 'upsert', record: { status: 'done', completed_at: new Date().toISOString() } }]);
  if (!processed.ok) throw new Error('Event completion write failed');
  return NextResponse.json({ received: true });
  } catch (error) {
    await store.executeWrites([{ table: 'stripe_events', id: eventKey, action: 'upsert', record: { status: 'failed', last_error: String(error).slice(0, 500) } }]).catch(() => {});
    return NextResponse.json({ message: 'Processing failed' }, { status: 500 });
  }
}
