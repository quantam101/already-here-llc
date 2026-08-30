'use client';

import { useEffect, useMemo, useState } from 'react';

export interface DarkPoolScore {
  rank: number;
  symbol: string;
  name: string;
  week_start: string;
  signal: string;
  score: number;
  shares: number;
  shares_change_pct: number | null;
  notional: number;
  notional_change_pct: number | null;
  avg_trade_size: number;
  avg_trade_size_change_pct: number | null;
  z_share?: number;
  z_notional?: number;
  z_size?: number;
  z_trade?: number;
}

export interface DarkPoolApiResponse {
  data: DarkPoolScore[];
  weeks: { week_start: string; count: number }[];
  generatedAt: string;
}

function toneFor(signal: string): 'up' | 'down' | 'neutral' | 'warn' {
  if (signal.includes('ACCUMULATION')) return 'up';
  if (signal.includes('DISTRIBUTION')) return 'down';
  if (signal === 'NEUTRAL') return 'neutral';
  return 'warn';
}

function SignalBadge({ signal }: { signal: string }) {
  const tone = toneFor(signal);
  const classes = {
    up: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    down: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
    neutral: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
    warn: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {signal.replace('_', ' ')}
    </span>
  );
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString();
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: React.ReactNode; tone?: 'neutral' | 'up' | 'down' | 'warn' }) {
  const toneClass = {
    neutral: 'text-slate-100',
    up: 'text-emerald-400',
    down: 'text-rose-400',
    warn: 'text-amber-400',
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 p-4 shadow-xl backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export function DarkPoolDashboard() {
  const [data, setData] = useState<DarkPoolApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/dark-pool?limit=200')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: DarkPoolApiResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.data.filter((row) => {
      if (signalFilter && row.signal !== signalFilter) return false;
      if (search) {
        const term = search.toUpperCase();
        return row.symbol.toUpperCase().includes(term) || row.name.toUpperCase().includes(term);
      }
      return true;
    });
  }, [data, signalFilter, search]);

  const signals = useMemo(
    () => Array.from(new Set(data?.data.map((d) => d.signal) ?? [])).sort(),
    [data]
  );

  const accumulationCount = useMemo(
    () => data?.data.filter((d) => d.signal.includes('ACCUMULATION')).length ?? 0,
    [data]
  );
  const distributionCount = useMemo(
    () => data?.data.filter((d) => d.signal.includes('DISTRIBUTION')).length ?? 0,
    [data]
  );
  const latestWeek = data?.weeks[0]?.week_start ?? '—';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-sm text-slate-400">Loading dark-pool analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center">
          <p className="text-rose-400">{error}</p>
          <p className="mt-2 text-xs text-slate-400">Run: python -m runtime.dark_pool.report --fetch</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">FINRA Dark Pool Command Center</h1>
            <p className="mt-1 text-sm text-slate-400">
              Weekly ATS transparency signals: institutional accumulation vs. distribution.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/30">
              FINRA API
            </span>
            <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-semibold text-slate-300 ring-1 ring-slate-500/30">
              Delayed 1-4w
            </span>
          </div>
        </div>

        <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Latest Week" value={latestWeek} />
          <Stat label="Tickers Scored" value={data?.data.length ?? 0} />
          <Stat label="Accumulation" value={accumulationCount} tone="up" />
          <Stat label="Distribution" value={distributionCount} tone="down" />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Signal Explorer</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol or name"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
              <select
                value={signalFilter}
                onChange={(e) => setSignalFilter(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              >
                <option value="">All signals</option>
                {signals.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="pb-2 pr-4 font-semibold">Rank</th>
                  <th className="pb-2 pr-4 font-semibold">Symbol</th>
                  <th className="pb-2 pr-4 font-semibold">Name</th>
                  <th className="pb-2 pr-4 font-semibold">Signal</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Score</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Shares</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Δ Shares</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Notional</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Δ Notional</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Avg Size</th>
                  <th className="pb-2 pr-4 font-semibold text-right">Δ Avg Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.slice(0, 100).map((row) => (
                  <tr key={`${row.week_start}-${row.symbol}`} className="hover:bg-slate-800/50">
                    <td className="py-3 pr-4 tabular-nums text-slate-500">{row.rank}</td>
                    <td className="py-3 pr-4 font-semibold text-sky-400">{row.symbol}</td>
                    <td className="py-3 pr-4 max-w-xs truncate text-slate-300" title={row.name}>
                      {row.name}
                    </td>
                    <td className="py-3 pr-4">
                      <SignalBadge signal={row.signal} />
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums font-semibold">{row.score.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-300">{formatNumber(row.shares)}</td>
                    <td
                      className={`py-3 pr-4 text-right tabular-nums ${
                        (row.shares_change_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPct(row.shares_change_pct)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-300">${formatNumber(row.notional)}</td>
                    <td
                      className={`py-3 pr-4 text-right tabular-nums ${
                        (row.notional_change_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPct(row.notional_change_pct)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-300">{row.avg_trade_size.toFixed(0)}</td>
                    <td
                      className={`py-3 pr-4 text-right tabular-nums ${
                        (row.avg_trade_size_change_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPct(row.avg_trade_size_change_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="mt-8 text-center text-sm text-slate-500">No scores match the current filter.</p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Usage</h2>
            <div className="mt-4 space-y-2 font-mono text-xs text-slate-300">
              <p className="rounded-xl bg-slate-950 p-3">python -m runtime.dark_pool.report --fetch --top 25</p>
              <p className="rounded-xl bg-slate-950 p-3">python -m runtime.dark_pool.report --fetch --signal STRONG_ACCUMULATION</p>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Scores are z-score composites of week-over-week change in shares, notional, trade count, and
              average trade size. Data is published by FINRA on a delayed basis and is intended for swing /
              position research, not real-time scalping.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Weekly Coverage</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {data?.weeks.map((w) => (
                <li key={w.week_start} className="flex items-center justify-between rounded-xl bg-slate-950/50 px-3 py-2">
                  <span className="text-slate-300">{w.week_start}</span>
                  <span className="text-slate-500">{w.count.toLocaleString()} tickers</span>
                </li>
              )) ?? <li className="text-slate-500">No weeks available</li>}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
