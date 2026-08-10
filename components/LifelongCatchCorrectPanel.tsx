'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type EngineeringSummary = {
  ok: boolean;
  generatedAt: string;
  database: {
    driver: string;
    durable: boolean;
    schemaVersion: number;
    recordCount: number;
    warning: string | null;
  };
  counts: {
    health: Record<string, number>;
    security: Record<string, number>;
    catchCorrect: number;
    codex: number;
    verification: number;
  };
  recent: {
    health: Array<Record<string, unknown>>;
    catchCorrect: Array<Record<string, unknown>>;
    codex: Array<Record<string, unknown>>;
    verification: Array<Record<string, unknown>>;
  };
};

const internalPrefixes = ['/revenue-command', '/command-center', '/operations', '/dc'];

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function metricTotal(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

export function LifelongCatchCorrectPanel() {
  const pathname = usePathname();
  const visible = useMemo(() => internalPrefixes.some((prefix) => pathname?.startsWith(prefix)), [pathname]);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<EngineeringSummary | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'offline'>('idle');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const load = async () => {
      setState('loading');
      try {
        const response = await fetch('/api/revenue-command-spine/engineering/summary', { cache: 'no-store' });
        if (!response.ok) throw new Error('Engineering summary unavailable');
        const data = (await response.json()) as EngineeringSummary;
        if (!cancelled) {
          setSummary(data);
          setState('ready');
        }
      } catch {
        if (!cancelled) setState('offline');
      }
    };
    load().catch(() => null);
    const timer = window.setInterval(() => load().catch(() => null), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [visible]);

  if (!visible) return null;

  const healthTotal = summary ? metricTotal(summary.counts.health) : 0;
  const securityTotal = summary ? metricTotal(summary.counts.security) : 0;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="lifelong-catch-correct-panel"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-4 right-4 z-[70] rounded-full border border-white/10 bg-[#07111f] px-4 py-3 text-xs font-semibold tracking-wide text-white shadow-xl transition hover:bg-[#0b1728] focus:outline-none focus:ring-2 focus:ring-action"
      >
        Lifelong Catch and Correct
      </button>

      {open ? (
        <aside
          id="lifelong-catch-correct-panel"
          aria-label="Lifelong Catch and Correct engineering assistant"
          className="fixed inset-x-3 bottom-20 z-[69] max-h-[72vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#07111f] p-5 text-slate-100 shadow-2xl sm:left-auto sm:right-4 sm:w-[420px]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Engineering intelligence</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Lifelong Catch and Correct</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">Live evidence from owned health, security, verification, and Codex records.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-white/30 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-slate-400">Panel state</p>
              <p className="mt-1 font-semibold text-white">{state}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-slate-400">Database</p>
              <p className="mt-1 font-semibold text-white">{summary?.database.durable ? 'Durable' : 'Non-authoritative'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-slate-400">Health signals</p>
              <p className="mt-1 font-semibold text-white">{healthTotal}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-slate-400">Security findings</p>
              <p className="mt-1 font-semibold text-white">{securityTotal}</p>
            </div>
          </div>

          {summary?.database.warning ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
              {summary.database.warning}
            </div>
          ) : null}

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">System health</h3>
              <span className="text-xs text-slate-400">{healthTotal} records</span>
            </div>
            <div className="mt-3 space-y-2">
              {(summary?.recent.health || []).length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">No health findings recorded yet.</p>
              ) : (
                summary?.recent.health.map((item, index) => (
                  <article key={String(item.id || index)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
                    <p className="font-semibold text-white">{displayValue(item.service || item.platform || 'System signal')}</p>
                    <p className="mt-1 text-slate-300">{displayValue(item.status || item.state)}</p>
                    <p className="mt-1 leading-5 text-slate-400">{displayValue(item.reason || item.recommendation)}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Catch and Correct</h3>
              <span className="text-xs text-slate-400">{summary?.counts.catchCorrect || 0} records</span>
            </div>
            <div className="mt-3 space-y-2">
              {(summary?.recent.catchCorrect || []).length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">No corrective rules recorded yet.</p>
              ) : (
                summary?.recent.catchCorrect.map((item, index) => (
                  <article key={String(item.id || index)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
                    <p className="font-semibold text-white">{displayValue(item.module || 'Module')}</p>
                    <p className="mt-1 leading-5 text-slate-300">{displayValue(item.error_summary)}</p>
                    <p className="mt-1 leading-5 text-slate-400">Correction: {displayValue(item.correction || item.rule)}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Codex changelog</h3>
              <span className="text-xs text-slate-400">{summary?.counts.codex || 0} records</span>
            </div>
            <div className="mt-3 space-y-2">
              {(summary?.recent.codex || []).length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">No Codex entries recorded yet.</p>
              ) : (
                summary?.recent.codex.map((item, index) => (
                  <article key={String(item.id || index)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
                    <p className="font-semibold text-white">{displayValue(item.repo || item.branch || 'Repository change')}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">{displayValue(item.commit_hash)}</p>
                    <p className="mt-1 leading-5 text-slate-300">{displayValue(item.message)}</p>
                    <p className="mt-1 text-slate-500">Deployment: {displayValue(item.deployment_status || item.status)}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      ) : null}
    </>
  );
}
