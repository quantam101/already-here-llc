import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'ProfitEngine Status | Already Here LLC',
  description: 'Live Vercel-rendered status surface for the ProfitEngine Oracle runtime.'
};

type EndpointCheck = {
  name: string;
  path: string;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  error: string | null;
};

const ORACLE_BASE_URL = (process.env.PROFITENGINE_ORACLE_BASE_URL || 'http://129.153.101.0:3000').replace(/\/$/, '');

const endpointTargets = [
  { name: 'Health', path: '/api/health' },
  { name: 'Status', path: '/api/status' },
  { name: 'Posts', path: '/api/posts' },
  { name: 'Earnings', path: '/api/earnings' }
] as const;

async function checkEndpoint(path: string): Promise<Omit<EndpointCheck, 'name' | 'path'>> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(`${ORACLE_BASE_URL}${path}`, {
      cache: 'no-store',
      signal: controller.signal
    });

    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown runtime check error'
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getProfitEngineStatus() {
  const endpoints = await Promise.all(
    endpointTargets.map(async (endpoint) => ({
      ...endpoint,
      ...(await checkEndpoint(endpoint.path))
    }))
  );

  const onlineCount = endpoints.filter((endpoint) => endpoint.ok).length;
  const state = onlineCount === endpoints.length ? 'Online' : onlineCount > 0 ? 'Degraded' : 'Oracle Runtime Offline';
  const summary =
    onlineCount === endpoints.length
      ? 'ProfitEngine Oracle runtime is reachable from Vercel.'
      : onlineCount > 0
        ? 'ProfitEngine is partially reachable. Do not trust automation or revenue data until all runtime checks pass.'
        : 'ProfitEngine Oracle runtime is not reachable from Vercel. This page is live, but the VM/runtime still needs repair.';

  return {
    checkedAt: new Date().toISOString(),
    state,
    endpoints,
    summary
  };
}

export default async function ProfitEngineStatusPage() {
  const status = await getProfitEngineStatus();

  return (
    <main className="container-shell py-16 lg:py-24">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">ProfitEngine control surface</span>
          <h1 className="section-title mt-5">Vercel-hosted runtime status without fake revenue.</h1>
          <p className="section-copy">
            Vercel can make this public dashboard/status layer live. It cannot restart the Oracle VM. This page checks the Oracle runtime and reports its actual condition without inventing posts, earnings, or automation state.
          </p>
        </div>
        <Link href="/" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy transition hover:border-action hover:text-action">
          Back to Already Here LLC
        </Link>
      </div>

      <section className="card p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="grid-label">Current runtime verdict</p>
            <div className="mt-4 rounded-3xl border border-borderBrand bg-soft p-6">
              <p className="text-3xl font-semibold text-navy">{status.state}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{status.summary}</p>
              <p className="mt-4 text-xs text-slate-500">
                Checked: {new Date(status.checkedAt).toLocaleString('en-US', { timeZone: 'America/Phoenix' })} MST
              </p>
              <p className="mt-2 font-mono text-xs text-slate-500">Oracle base: {ORACLE_BASE_URL}</p>
            </div>
          </div>

          <div>
            <p className="grid-label">Endpoint checks</p>
            <div className="mt-4 grid gap-3">
              {status.endpoints.map((endpoint) => (
                <div key={endpoint.path} className="rounded-2xl border border-borderBrand bg-soft px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-navy">{endpoint.name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{endpoint.path}</p>
                    </div>
                    <span className="rounded-full border border-borderBrand bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                      {endpoint.ok ? 'OK' : 'Failed'} {endpoint.status ? `(${endpoint.status})` : ''}
                    </span>
                  </div>
                  {endpoint.error ? <p className="mt-2 text-xs leading-5 text-slate-500">{endpoint.error}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">Latency: {endpoint.latencyMs}ms</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-borderBrand bg-white p-5 text-sm leading-7 text-slate-700">
          Dashboard availability is separate from Oracle runtime availability. This Vercel page can be live while the VM is offline.
        </div>
        <div className="rounded-3xl border border-borderBrand bg-white p-5 text-sm leading-7 text-slate-700">
          Revenue is not inferred. Real earnings require live Stripe, PayPal, affiliate, or platform confirmation.
        </div>
        <div className="rounded-3xl border border-borderBrand bg-white p-5 text-sm leading-7 text-slate-700">
          Posting is not verified unless the runtime endpoints and platform-side publish records return current successful activity.
        </div>
      </section>
    </main>
  );
}
