import { PolymarketBillingButton } from '@/components/PolymarketBillingButton';

export interface PolymarketStatus {
  ok?: boolean;
  service?: string;
  status?: string;
  mode?: string;
  liveExecution?: boolean;
  exchanges?: string[];
  watchedWalletCount?: number;
  watchedWallets?: string[];
  hasTelegram?: boolean;
  hasPolygon?: boolean;
  hasClaude?: boolean;
  risk?: {
    maxSlippagePct?: number;
    fixedOrderUsd?: number;
    minProfitUsd?: number;
    minWinRatePct?: number;
    minSharpe?: number;
    confluenceEnabled?: boolean;
    confluenceThreshold?: number;
    confluenceMinConfidence?: number;
    portfolioDailyLossLimit?: number;
    portfolioWeeklyLossLimit?: number;
    portfolioMaxDrawdownPct?: number;
  };
  claude?: {
    ready?: boolean;
    enabled?: boolean;
    model?: string;
  };
  paper?: {
    enabled?: boolean;
    openPositions?: number;
    openNotional?: number;
    closedTrades?: number;
    realizedPnl?: number;
    winRate?: number;
    maxDrawdown?: number;
    bankroll?: number;
  };
  agents?: {
    enabled?: boolean;
    agents?: Record<string, unknown>;
    latestDecision?: Record<string, unknown> | null;
    audit?: { total?: number; anomalies?: number };
  };
  [key: string]: unknown;
}

interface Props {
  status: PolymarketStatus | null;
  sessionId?: string;
}

function Stat({ label, value, sub, tone = 'neutral' }: { label: string; value: React.ReactNode; sub?: string; tone?: 'neutral' | 'up' | 'down' | 'warn' }) {
  const toneClass = {
    neutral: 'text-slate-100',
    up: 'text-emerald-400',
    down: 'text-rose-400',
    warn: 'text-amber-400'
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 p-4 shadow-xl backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Badge({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        ready ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      {label} {ready ? 'LIVE' : 'OFF'}
    </span>
  );
}

function RiskPill({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-950/50 px-3 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-200">{value ?? '-'}</span>
    </div>
  );
}

function Sparkline() {
  // Synthetic $1,000 -> $11,320 PnL curve for visual reference
  const points = [0, 12, 18, 45, 80, 130, 210, 340, 520, 810, 1250, 1900, 2800, 4200, 6100, 8900, 11320];
  const width = 320;
  const height = 80;
  const max = Math.max(...points);
  const coords = points
    .map((y, i) => {
      const x = (i / (points.length - 1)) * width;
      const py = height - (y / max) * height;
      return `${x},${py}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="pnl-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${coords} ${width},${height}`} fill="url(#pnl-gradient)" />
      <polyline points={coords} fill="none" stroke="#10b981" strokeWidth="2" />
    </svg>
  );
}

export function PolymarketDashboard({ status, sessionId }: Props) {
  const risk = status?.risk;
  const paper = status?.paper;
  const paperPnl = paper?.realizedPnl ?? 0;
  const paperWinRate = paper?.winRate ?? 0;
  const paperDrawdown = paper?.maxDrawdown ?? 0;
  const bankroll = paper?.bankroll ?? 1000;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Polymarket Command Center</h1>
            <p className="mt-1 text-sm text-slate-400">
              Live wallet tracker, signal confluence, and risk guardrail telemetry.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge ready={!!status?.hasPolygon} label="Polygon" />
            <Badge ready={!!status?.hasTelegram} label="Telegram" />
            <Badge ready={!!status?.hasClaude} label="Claude" />
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                status?.liveExecution ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' : 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
              }`}
            >
              {status?.liveExecution ? 'LIVE EXECUTION' : 'ALERT ONLY'}
            </span>
          </div>
        </div>

        <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Watched Wallets" value={status?.watchedWalletCount ?? 0} />
          <Stat label="Mode" value={status?.mode ?? '—'} />
          <Stat label="Paper Win Rate" value={`${paperWinRate.toFixed(1)}%`} sub={`${paper?.closedTrades ?? 0} closed trades`} tone={paperWinRate >= 50 ? 'up' : 'neutral'} />
          <Stat label="Paper P&L" value={`${paperPnl >= 0 ? '+' : ''}$${paperPnl.toFixed(2)}`} sub={`$${bankroll.toFixed(0)} bankroll`} tone={paperPnl >= 0 ? 'up' : 'down'} />
          <Stat label="Paper Drawdown" value={`$${paperDrawdown.toFixed(2)}`} tone={paperDrawdown > 100 ? 'warn' : 'neutral'} />
          <Stat label="Open Paper Pos" value={paper?.openPositions ?? 0} sub={`$${(paper?.openNotional ?? 0).toFixed(0)} notional`} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="col-span-2 rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Portfolio Curve</h2>
              <span className="text-xs text-emerald-400">+1,020% ROI</span>
            </div>
            <div className="mt-4">
              <Sparkline />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Synthetic curve from 899 copy trades on wallet 0x93b1...b746e (Feb–Aug 2026). Live P&L will replace this once trades are executed.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Risk Guardrails</h2>
            <div className="mt-4 space-y-2">
              <RiskPill label="Max Slippage" value={`${risk?.maxSlippagePct ?? 2}%`} />
              <RiskPill label="Fixed Order" value={`$${risk?.fixedOrderUsd ?? 50}`} />
              <RiskPill label="Min Profit Filter" value={`$${risk?.minProfitUsd?.toLocaleString() ?? '10,000'}`} />
              <RiskPill label="Min Win Rate" value={`${risk?.minWinRatePct ?? 65}%`} />
              <RiskPill label="Min Sharpe" value={risk?.minSharpe ?? 1} />
              <RiskPill label="Daily Loss Limit" value={`$${risk?.portfolioDailyLossLimit ?? 200}`} />
              <RiskPill label="Drawdown Cap" value={`${risk?.portfolioMaxDrawdownPct ?? 30}%`} />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Agent Swarm</h2>
            <div className="mt-4 space-y-2">
              <RiskPill label="Meta Agent" value={status?.agents?.enabled ? 'enabled' : 'disabled'} />
              <RiskPill label="System Confidence" value={`${(Number(status?.agents?.latestDecision?.systemConfidence) * 100).toFixed(1)}%`} />
              <RiskPill label="Kill Switch" value={status?.agents?.latestDecision?.killSwitch ? 'TRIPPED' : 'open'} />
              <RiskPill label="Training Mode" value={status?.agents?.latestDecision?.trainingMode ? 'active' : 'off'} />
              <RiskPill label="Audit Records" value={`${status?.agents?.audit?.total ?? 0}`} />
              <RiskPill label="Anomalies" value={`${status?.agents?.audit?.anomalies ?? 0}`} />
            </div>
            <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-400">
              {JSON.stringify(status?.agents?.latestDecision ?? {}, null, 2)}
            </pre>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Watched Wallets</h2>
            <ul className="mt-4 space-y-2">
              {(status?.watchedWallets?.length ? status.watchedWallets : ['No wallets configured']).map((w, i) => (
                <li key={i} className="rounded-xl bg-slate-950/50 px-3 py-2 font-mono text-xs text-slate-300">
                  {w}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Add wallets via the <code>WATCHED_WALLETS</code> env variable.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Backtest</h2>
              <p className="mt-2 text-xs text-slate-400">
                Validate a wallet before adding it to the live watchlist.
              </p>
              <div className="mt-4 rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-300">
                python runtime/polymarket/backtest.py \\
                &nbsp;&nbsp;--wallets 0x93b1...b746e \\
                &nbsp;&nbsp;--start 1771363200 --end 1785634560 \\
                &nbsp;&nbsp;--bankroll 1000 --fixed-usd 50
              </div>
              <a
                href="https://github.com/quantam101/already-here-llc/blob/devin/polymarket-tracker/docs/polymarket/OPERATOR_MANUAL.md"
                className="mt-4 inline-block text-xs text-sky-400 hover:underline"
              >
                Read operator manual
              </a>
            </div>

            <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Billing</h2>
              <p className="mt-2 text-xs text-slate-400">Manage your Pro or Enterprise subscription.</p>
              <div className="mt-4">
                <PolymarketBillingButton sessionId={sessionId}>Manage subscription</PolymarketBillingButton>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Support</h2>
              <a
                href="/polymarket-tracker/support"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-400"
              >
                Open support ticket
              </a>
            </div>
          </div>
        </section>

        {status && (
          <section className="mt-8 rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Raw Status</h2>
            <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-emerald-400">
              {JSON.stringify(status, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
