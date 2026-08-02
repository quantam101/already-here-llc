import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polymarket Tracker Dashboard',
  description: 'Subscriber dashboard for the Polymarket Smart Wallet Tracker.'
};

const DASHBOARD_SECRET = process.env.POLYMARKET_DASHBOARD_SECRET;

function isAuthorized(token: string | undefined): boolean {
  if (!DASHBOARD_SECRET) return false;
  return token === DASHBOARD_SECRET;
}

async function loadStatus(token?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const url = token ? `${baseUrl}/api/polymarket-tracker/status?token=${encodeURIComponent(token)}` : `${baseUrl}/api/polymarket-tracker/status`;
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
  searchParams: Promise<{ token?: string; success?: string }> | { token?: string; success?: string };
}) {
  const params = await searchParams;
  const token = params.token;
  const authorized = isAuthorized(token);
  const status = authorized ? await loadStatus(token) : null;

  if (!authorized) {
    return (
      <div className="container-shell py-24">
        <div className="card mx-auto max-w-md p-8" data-proof-surface>
          <h1 className="text-2xl font-semibold text-navy">Polymarket Tracker Dashboard</h1>
          <p className="mt-4 text-sm text-slate-600">Enter your dashboard access token to view status, wallets, and risk settings.</p>
          <form className="mt-6 space-y-4" method="get">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-slate-700">Access token</label>
              <input
                id="token"
                name="token"
                type="password"
                required
                className="mt-1 block w-full rounded-md border border-borderBrand px-3 py-2 text-sm focus:border-action focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="link-ring inline-flex w-full items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy"
            >
              Open dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shell py-16">
      <div className="mb-10">
        <span className="eyebrow proof-label">Subscriber dashboard</span>
        <h1 className="section-title mt-5">Polymarket Tracker status</h1>
      </div>

      {params.success === 'true' && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Welcome to Pro Tracker. Your subscription is active.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6" data-proof-surface>
          <p className="grid-label proof-label">System status</p>
          <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-green-400">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>

        <div className="card p-6" data-proof-surface>
          <p className="grid-label proof-label">Run a backtest</p>
          <p className="mt-4 text-sm text-slate-600">
            Use the CLI to validate any wallet before you add it to the alert feed.
          </p>
          <div className="mt-4 rounded-md bg-slate-900 p-4 text-xs text-slate-300">
            <code>
              python runtime/polymarket/backtest.py \\
              &nbsp;&nbsp;--wallets 0x93b110ff31deb58847e841b3cbc6535b3e7b746e \\
              &nbsp;&nbsp;--start 1771363200 --end 1785634560 \\
              &nbsp;&nbsp;--bankroll 1000 --fixed-usd 50
            </code>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            See <a href="https://github.com/quantam101/already-here-llc/blob/devin/polymarket-tracker/docs/polymarket/OPERATOR_MANUAL.md" className="text-action underline">operator manual</a> for full options.
          </p>
        </div>

        <div className="card p-6" data-proof-surface>
          <p className="grid-label proof-label">Quick links</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>• <a className="text-action underline" href="/polymarket-tracker">Public landing page</a></li>
            <li>• <a className="text-action underline" href="https://github.com/quantam101/already-here-llc/blob/devin/polymarket-tracker/docs/polymarket/TRAINING.md">Training guide</a></li>
            <li>• <a className="text-action underline" href="https://github.com/quantam101/already-here-llc/blob/devin/polymarket-tracker/docs/polymarket/OPERATOR_MANUAL.md">Operator manual</a></li>
            <li>• <a className="text-action underline" href="/api/polymarket-tracker/status">Public status endpoint</a></li>
          </ul>
        </div>

        <div className="card p-6" data-proof-surface>
          <p className="grid-label proof-label">Need help?</p>
          <p className="mt-4 text-sm text-slate-600">
            Enterprise customers get custom wallet filters, private RPC endpoints, and a monthly strategy review.
          </p>
          <a
            href="mailto:info@alreadyherellc.com?subject=Polymarket%20Tracker%20Support"
            className="link-ring mt-4 inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
