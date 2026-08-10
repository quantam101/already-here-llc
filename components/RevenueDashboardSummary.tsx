'use client';

import { useCallback, useEffect, useState } from 'react';

type Dashboard = {
  generatedAt: string;
  phoenixDate: string;
  database: { durable: boolean; driver: string; schemaVersion: number; recordCount: number; warning?: string };
  revenue: { paidTodayCents: number; productTodayCents: number; verifiedAiAttributedTodayCents: number; realizedTodayCents: number; monthToDateCents: number; targetTodayCents: number; targetGapCents: number };
  pipeline: { opportunities: number; open: number; p0: number; p1: number; weightedValueCents: number; pendingReview: number };
  operations: { dispatchesOpen: number; routeStacksDraft: number; haulingOpen: number; autoworksOpen: number; procurementOpen: number; productsActive: number };
  ai: { actions: number; pendingActions: number; memoryRecords: number; outcomes: number; verifiedRevenueOutcomes: number };
  engineering: { failingHealthSignals: number; securityFindingsOpen: number; catchCorrectEvents: number; codexEvents: number; verificationEvents: number };
};

function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((value || 0) / 100);
}

export function RevenueDashboardSummary() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/revenue-command-spine/dashboard', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Dashboard unavailable');
      const body = await response.json() as { dashboard?: Dashboard };
      if (!body.dashboard) throw new Error('Dashboard payload missing');
      setDashboard(body.dashboard);
      setStatus('ready');
    } catch {
      setDashboard(null);
      setStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    load().catch(() => null);
    const timer = window.setInterval(() => load().catch(() => null), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!dashboard) {
    return (
      <section className="container-shell pt-8">
        <div className="rounded-3xl border border-borderBrand bg-soft p-5 text-sm text-slate-600">Revenue dashboard: {status}. Authenticate Revenue Command to load owned operational data.</div>
      </section>
    );
  }

  const progress = Math.min(100, Math.round((dashboard.revenue.realizedTodayCents / Math.max(1, dashboard.revenue.targetTodayCents)) * 100));
  return (
    <section className="container-shell pt-8" aria-label="Revenue Command dashboard">
      <div className="rounded-3xl border border-borderBrand bg-[#07111f] p-5 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owned operating dashboard</p>
            <h2 className="mt-2 text-2xl font-semibold">{money(dashboard.revenue.realizedTodayCents)} of {money(dashboard.revenue.targetTodayCents)} today</h2>
            <p className="mt-2 text-sm text-slate-300">Gap {money(dashboard.revenue.targetGapCents)} · MTD {money(dashboard.revenue.monthToDateCents)} · Weighted pipeline {money(dashboard.pipeline.weightedValueCents)}</p>
          </div>
          <div className="text-xs leading-6 text-slate-300">
            <p>Database: {dashboard.database.driver} schema {dashboard.database.schemaVersion}</p>
            <p>Durable: {dashboard.database.durable ? 'yes' : 'no'} · Records: {dashboard.database.recordCount}</p>
            <p>Phoenix date: {dashboard.phoenixDate}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`Daily revenue progress ${progress}%`}><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div>
        {dashboard.database.warning ? <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">{dashboard.database.warning}</p> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Pipeline" value={`${dashboard.pipeline.open} open / ${dashboard.pipeline.p0} P0`} />
          <Metric label="Operations" value={`${dashboard.operations.dispatchesOpen} dispatch / ${dashboard.operations.haulingOpen} haul`} />
          <Metric label="AutoWorks" value={`${dashboard.operations.autoworksOpen} active`} />
          <Metric label="AI" value={`${dashboard.ai.actions} actions / ${dashboard.ai.outcomes} outcomes`} />
          <Metric label="Engineering" value={`${dashboard.engineering.failingHealthSignals} failing / ${dashboard.engineering.securityFindingsOpen} security`} />
        </div>
        <button type="button" onClick={() => load().catch(() => null)} className="mt-4 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-white/50">Refresh owned data</button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>;
}
