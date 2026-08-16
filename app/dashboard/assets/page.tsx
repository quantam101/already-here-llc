import type { Metadata } from 'next';
import Link from 'next/link';
import { getCanonicalStore } from '@/lib/canonical-store';

export const metadata: Metadata = {
  title: 'Asset Register | Already Here Dashboard',
  description: 'Equipment, vehicles, and asset lifecycle records.',
  alternates: { canonical: '/dashboard/assets' }
};

export const dynamic = 'force-dynamic';

function statusBadgeClass(status?: string) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'in_repair': return 'bg-yellow-100 text-yellow-700';
    case 'retired': return 'bg-slate-200 text-slate-600';
    case 'lost': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export default async function AssetsDashboardPage() {
  const store = getCanonicalStore();
  const [assets, maintenance] = await Promise.all([
    store.queryTable('assets', 1000),
    store.queryTable('maintenance', 1000)
  ]);

  const assetsByStatus = { active: 0, in_repair: 0, retired: 0, lost: 0, unknown: 0 };
  for (const a of assets) {
    const status = (a as { status?: string }).status ?? 'unknown';
    if (status in assetsByStatus) assetsByStatus[status as keyof typeof assetsByStatus] += 1;
    else assetsByStatus.unknown += 1;
  }

  return (
    <main className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Asset register</span>
      <h1 className="section-title mt-5">Equipment and vehicle lifecycle</h1>
      <p className="section-copy">
        Live canonical asset records and maintenance/inspection/calibration/certification history.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(assetsByStatus).map(([status, count]) => (
          <div key={status} className="rounded-2xl border border-borderBrand bg-soft p-5 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">{status.replace('_', ' ')}</p>
            <p className="mt-2 text-2xl font-semibold text-action">{count}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-borderBrand bg-soft p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500">Maintenance events</p>
          <p className="mt-2 text-2xl font-semibold text-action">{maintenance.length}</p>
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-6">
        <h2 className="text-lg font-semibold text-navy">Assets</h2>
        {assets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No assets recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-borderBrand text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Make / Model</th>
                  <th className="py-2 pr-4">Serial / Tag</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 50).map((a) => {
                  const record = a as { id: string; name?: string; category?: string; make?: string; model?: string; serial_number?: string; asset_tag?: string; location?: string; status?: string };
                  return (
                    <tr key={record.id} className="border-b border-borderBrand/50">
                      <td className="py-2 pr-4 font-medium text-navy">{record.name ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{record.category ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{[record.make, record.model].filter(Boolean).join(' ') || '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{record.serial_number || record.asset_tag || '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{record.location ?? '—'}</td>
                      <td className="py-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(record.status)}`}>
                          {record.status ?? 'unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-borderBrand bg-soft p-6">
        <h2 className="text-lg font-semibold text-navy">Maintenance / inspection / calibration history</h2>
        {maintenance.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No maintenance events yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-borderBrand text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Asset</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Result</th>
                  <th className="py-2 pr-4">Performed by</th>
                  <th className="py-2 pr-4">Due</th>
                  <th className="py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {maintenance.slice(0, 50).map((m) => {
                  const record = m as { id: string; asset_id?: string; maintenance_type?: string; result?: string; performed_by?: string; due_date?: string; cost_cents?: number; created_at?: string };
                  return (
                    <tr key={record.id} className="border-b border-borderBrand/50">
                      <td className="py-2 pr-4 font-medium text-navy">{record.asset_id ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{record.maintenance_type ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{record.result ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{record.performed_by ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-600">{record.due_date ? new Date(record.due_date).toLocaleDateString() : '—'}</td>
                      <td className="py-2 text-slate-600">${((record.cost_cents ?? 0) / 100).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-10">
        <Link href="/dashboard" className="inline-flex rounded-full border border-action px-4 py-2 text-sm font-semibold text-action hover:bg-action/5">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
