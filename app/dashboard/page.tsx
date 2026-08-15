import type { Metadata } from 'next';
import Link from 'next/link';
import { getDashboardMetrics } from '@/lib/dashboard';

export const metadata: Metadata = {
  title: 'Executive Dashboard',
  description: 'Live operational metrics for leads, customers, technicians, work orders, and revenue.',
  alternates: { canonical: '/dashboard' }
};

export const dynamic = 'force-dynamic';

const sections = [
  { title: 'Technician network', description: 'Applicants, dispatch-ready technicians, and skill matching.', action: 'View network', href: '/technician-network' },
  { title: 'Work orders', description: 'Open dispatches, assignments, and closeout queue.', action: 'View work orders', href: '/dispatch' },
  { title: 'Opportunities', description: 'Qualified leads, proposals, and revenue pipeline.', action: 'View pipeline', href: '/revenue-mesh' },
  { title: 'GINC marketplace', description: 'Vehicles, spaces, equipment listings, rentals, and matches.', action: 'Browse GINC', href: '/ginc/network' },
  { title: 'Referrals', description: 'Referral codes, shareable links, and earned credits.', action: 'View referrals', href: '/dashboard/referrals' },
  { title: 'Payments', description: 'Deposit and subscription invoices, payment methods, and payout settings.', action: 'View payments', href: '/dashboard/payments' }
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default async function DashboardPage() {
  const metrics = getDashboardMetrics();

  const quickStats: Array<[string, string | number]> = [
    ['Technicians', metrics.counts.technicians],
    ['Dispatch-ready', metrics.dispatchReadyTechnicians],
    ['Work orders', metrics.counts.jobs + metrics.counts.dispatches + metrics.counts.hauling_jobs + metrics.counts.repair_orders],
    ['Leads', metrics.counts.leads],
    ['Opportunities', metrics.counts.opportunities],
    ['Collected revenue', formatCurrency(metrics.totalRevenueCents)]
  ];

  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Executive dashboard</span>
      <h1 className="section-title mt-5">Operating metrics</h1>
      <p className="section-copy">
        Live counts from the canonical operating database. Data refreshes on every request and reflects records written through intake, dispatch, applicant, and revenue flows.
      </p>

      <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-6">
        <h2 className="text-lg font-semibold text-navy">Quick stats</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickStats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-borderBrand bg-white p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-action">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">Generated at {metrics.generatedAt}</p>
      </section>

      {metrics.recentRecords.length > 0 ? (
        <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-6">
          <h2 className="text-lg font-semibold text-navy">Recent canonical records</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-borderBrand text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Table</th>
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentRecords.map((record) => (
                  <tr key={`${record.table}-${record.id}`} className="border-b border-borderBrand/50">
                    <td className="py-2 pr-4 font-medium text-navy">{record.table}</td>
                    <td className="py-2 pr-4 font-mono text-slate-600">{record.id.slice(0, 24)}...</td>
                    <td className="py-2 pr-4 text-slate-600">{record.source}</td>
                    <td className="py-2 text-slate-600">{new Date(record.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} className="card p-6">
            <h2 className="text-lg font-semibold text-navy">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{section.description}</p>
            <Link href={section.href} className="mt-4 inline-flex rounded-full border border-action px-4 py-2 text-sm font-semibold text-action hover:bg-action/5">
              {section.action}
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
