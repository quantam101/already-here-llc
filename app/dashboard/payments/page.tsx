import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site';
import { StripePaymentButton } from '@/components/StripePaymentButton';

export const metadata: Metadata = {
  title: 'Payments',
  description: 'Manage deposit and subscription payments for rentals and marketplace transactions.',
  alternates: { canonical: '/dashboard/payments' }
};

export default function PaymentsPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Payments</span>
      <h1 className="section-title mt-5">Payments</h1>
      <p className="section-copy">
        View invoices, manage payment methods, and track payouts. Live Stripe checkout for deposits and subscriptions will be enabled once a Stripe account is connected.
      </p>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-navy">Scooter rental onboarding</h2>
          <p className="mt-2 text-sm text-slate-600">$305 total — $155 first week + $150 refundable security deposit.</p>
          <div className="mt-4">
            <StripePaymentButton mode="payment" amount={30500} rentalId="preview">
              Pay $305 onboarding deposit
            </StripePaymentButton>
          </div>
          <p className="mt-4 text-sm text-slate-600">Stripe checkout for deposits and weekly/monthly subscriptions is configured but requires a live Stripe account and webhooks.</p>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-navy">Marketplace payouts</h2>
          <p className="mt-2 text-sm text-slate-600">Track rental income, listing fees, and referral credits.</p>
          <p className="mt-4 text-sm text-slate-600">Payouts will be processed through Stripe Connect once vehicle owners and fleet partners are onboarded.</p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        This is a preview page. To activate payments, add <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PUBLISHABLE_KEY</code>, and <code>STRIPE_WEBHOOK_SECRET</code> to environment variables, then connect the checkout API routes.
      </section>

      <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-5 text-sm leading-6 text-slate-700">
        <strong>Billing support:</strong> For invoices, payment questions, W-9 requests, and vendor setup, contact{' '}
        <a href={`mailto:${siteConfig.billingEmail}`} className="text-action underline">
          {siteConfig.billingEmail}
        </a>
        . Include invoice number, work-order number, client name, and service location when applicable.
      </section>
    </div>
  );
}
