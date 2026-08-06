import type { Metadata } from 'next';
import { PolymarketDashboard } from '@/components/PolymarketDashboard';

export const metadata: Metadata = {
  title: 'Polymarket Tracker Dashboard',
  description: 'Subscriber command center for the Polymarket Smart Wallet Tracker.'
};

const DASHBOARD_SECRET = process.env.POLYMARKET_DASHBOARD_SECRET;

function isAuthorized(token: string | undefined): boolean {
  if (!DASHBOARD_SECRET) return false;
  return token === DASHBOARD_SECRET;
}

async function loadStatus(token?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const url = token
      ? `${baseUrl}/api/polymarket-tracker/status?token=${encodeURIComponent(token)}`
      : `${baseUrl}/api/polymarket-tracker/status`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default async function PolymarketDashboardPage({
  searchParams
}: {
  searchParams:
    | Promise<{ token?: string; success?: string; session_id?: string }>
    | { token?: string; success?: string; session_id?: string };
}) {
  const params = await searchParams;
  const token = params.token;
  const sessionId = params.session_id;
  const authorized = isAuthorized(token);
  const status = authorized ? await loadStatus(token) : null;

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-24 text-slate-100">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-700/50 bg-slate-900/80 p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-white">Polymarket Command Center</h1>
          <p className="mt-4 text-sm text-slate-400">
            Enter your dashboard access token to view live tracker telemetry, wallets, and risk settings.
          </p>
          <form className="mt-6 space-y-4" method="get">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-slate-300">
                Access token
              </label>
              <input
                id="token"
                name="token"
                type="password"
                required
                className="mt-1 block w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Open dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <PolymarketDashboard status={status} sessionId={sessionId} />;
}
