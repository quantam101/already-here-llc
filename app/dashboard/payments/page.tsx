import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site';
import { getCanonicalStore } from '@/lib/canonical-store';

export const metadata: Metadata = {
  title: 'Payments | Already Here Dashboard',
  description: 'Collected, invoiced, and projected revenue from the canonical graph.',
  alternates: { canonical: '/dashboard/payments' }
};

export const dynamic = 'force-dynamic';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function statusBadgeClass(status?: string) {
  switch (status) {
    case 'collected':
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'invoiced':
    case 'booked':
      return 'bg-blue-100 text-blue-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export default async function PaymentsPage() {
  const store = getCanonicalStore();
  const [revenueEvents, payouts, refunds] = await Promise.all([
    store.queryTable('revenue_events', 1000),
    store.queryTable('payouts', 1000),
    store.queryTable('refunds', 1000)
  ]);

  const collected = revenueEvents
    .filter((r) => (r as { status?: string }).status === 'collected' || (r as { status?: string }).status === 'paid')
    .reduce((sum, r) => sum + (typeof (r as { amount_cents?: number }).amount_cents === 'number' ? (r as { amount_cents: number }).amount_cents : 0), 0);
  const invoiced = revenueEvents
    .filter((r) => (r as { status?: string }).status === 'invoiced')
    .reduce((sum, r) => sum + (typeof (r as { amount_cents?: number }).amount_cents === 'number' ? (r as { amount_cents: number }).amount_cents : 0), 0);
  const failed = revenueEvents
    .filter((r) => (r as { status?: string }).status === 'failed')
    .reduce((sum, r) => sum + (typeof (r as { amount_cents?: number }).amount_cents === 'number' ? (r as { amount_cents: number }).amount_cents : 0), 0);
  const refundTotal = refunds.reduce((sum, r) => sum + (typeof (r as { amount_cents?: number }).amount_cents === 'number' ? (r as { amount_cents: number }).amount_cents : 0), 0);
  const payoutTotal = payouts.reduce((sum, r) => sum + (typeof (r as { amount_cents?: number }).amount_cents === 'number' ? (r as { amount_cents: number }).amount_cents : 0), 0);

  return (
    <main className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Payments</span>
      <h1 className="section-title mt-5">Revenue, payouts, and refunds</h1>
      <p className="section-copy">
        Live canonical records from Stripe webhooks, closeouts, and intake. Data refreshes on every request.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Collected', collected],
          ['Invoiced / booked', invoiced],
          ['Failed', failed],
          ['Refunds', refundTotal],
          ['Payouts', payoutTotal],
          ['Net revenue', collected - refundTotal]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-borderBrand bg-soft p-5 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-action">{formatCurrency(value as number)}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-6">
        <h2 className="text-lg font-semibold text-navy">Revenue events</h2>
        {revenueEvents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No revenue events yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-borderBrand text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Channel</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {revenueEvents.slice(0, 50).map((r) => {
                  const record = r as { id: string; source?: string; channel?: string; status?: string; amount_cents?: number; created_at?: string };
                  return (
                    <tr key={record.id} className="border-b border-borderBrand/50">
                      <td className="py-2 pr-4 font-medium text-navy">{record.source ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{record.channel ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(record.status)}`}>
                          {record.status ?? 'unknown'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-600">{formatCurrency(record.amount_cents ?? 0)}</td>
                      <td className="py-2 text-slate-600">{record.created_at ? new Date(record.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-5 text-sm leading-6 text-slate-700">
        <strong>Billing support:</strong> For invoices, payment questions, W-9 requests, and vendor setup, contact{' '}
        <a href={`mailto:${siteConfig.billingEmail}`} className="text-action underline">
          {siteConfig.billingEmail}
        </a>
        . Include invoice number, work-order number, client name, and service location when applicable.
      </section>

      <div className="mt-10">
        <Link href="/dashboard" className="inline-flex rounded-full border border-action px-4 py-2 text-sm font-semibold text-action hover:bg-action/5">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
