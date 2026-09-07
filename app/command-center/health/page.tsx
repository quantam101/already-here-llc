import Link from 'next/link';
import { buildSystemHealthSummary } from '@/lib/system-health';
import { buildRevenueActionQueue } from '@/lib/revenue-action-queue';

export const dynamic = 'force-dynamic';

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default async function HealthPage() {
  const [health, revenue] = await Promise.all([buildSystemHealthSummary(), buildRevenueActionQueue()]);
  return (
    <main className="shell">
      <div className="flex flex-wrap items-center gap-3">
        <Link className="badge" href="/command-center">Command Center</Link>
        <span className="badge">Overall: {health.overall}</span>
      </div>
      <h1 className="mt-4">System Health and Revenue Control</h1>
      <p className="muted">Independent component health, CI capacity signals, and the evidence-backed $500/day action queue.</p>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm text-white/60">Revenue today</p><p className="mt-1 text-2xl font-semibold">{money(revenue.realizedTodayCents)}</p></article>
        <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm text-white/60">Remaining to $500</p><p className="mt-1 text-2xl font-semibold">{money(revenue.remainingToTargetCents)}</p></article>
        <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm text-white/60">Weighted pipeline</p><p className="mt-1 text-2xl font-semibold">{money(revenue.weightedPipelineCents)}</p></article>
        <article className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm text-white/60">Health findings</p><p className="mt-1 text-2xl font-semibold">{health.unhealthyCount + health.degradedCount + health.unknownCount}</p></article>
      </section>

      <section className="mt-8">
        <h2>Component health</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(health.byComponent).map(([component, status]) => (
            <article key={component} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">{component.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-sm text-white/60">{status}</p>
            </article>
          ))}
          {Object.keys(health.byComponent).length === 0 && <p className="muted">No component health records yet.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2>$500/day action queue</h2>
        <div className="mt-3 space-y-3">
          {revenue.items.slice(0, 12).map((item) => (
            <article key={`${item.sourceTable}:${item.id}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-white break-words">{item.title}</p>
                  <p className="text-sm text-white/60">{item.sourceTable} · {item.status} · recommended: {item.recommendedAction}</p>
                </div>
                <div className="sm:text-right">
                  <p className="font-semibold">{money(item.expectedContributionCents)}</p>
                  <p className="text-sm text-white/60">priority {item.priorityScore}</p>
                </div>
              </div>
            </article>
          ))}
          {revenue.items.length === 0 && <p className="muted">No evidence-backed opportunities are currently queued.</p>}
        </div>
      </section>
    </main>
  );
}
