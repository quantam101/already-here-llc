export const PROFITENGINE_ORACLE_BASE_URL =
  process.env.PROFITENGINE_ORACLE_BASE_URL || 'http://129.153.101.0:3000';

export type ProfitEngineRuntimeState = 'online' | 'offline' | 'degraded';

export type ProfitEngineStatus = {
  checkedAt: string;
  state: ProfitEngineRuntimeState;
  baseUrl: string;
  endpoints: Array<{
    name: string;
    path: string;
    ok: boolean;
    status: number | null;
    latencyMs: number;
    error: string | null;
  }>;
  summary: string;
};

const endpointChecks = [
  { name: 'Health', path: '/api/health' },
  { name: 'Status', path: '/api/status' },
  { name: 'Posts', path: '/api/posts' },
  { name: 'Earnings', path: '/api/earnings' }
] as const;

async function checkEndpoint(baseUrl: string, path: string) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
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
    const message = error instanceof Error ? error.message : 'Unknown fetch error';
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      error: message
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getProfitEngineStatus(): Promise<ProfitEngineStatus> {
  const baseUrl = PROFITENGINE_ORACLE_BASE_URL.replace(/\/$/, '');
  const results = await Promise.all(
    endpointChecks.map(async (endpoint) => {
      const result = await checkEndpoint(baseUrl, endpoint.path);
      return {
        name: endpoint.name,
        path: endpoint.path,
        ...result
      };
    })
  );

  const onlineCount = results.filter((result) => result.ok).length;
  const state: ProfitEngineRuntimeState =
    onlineCount === results.length ? 'online' : onlineCount > 0 ? 'degraded' : 'offline';

  const summary =
    state === 'online'
      ? 'ProfitEngine Oracle runtime is reachable from Vercel.'
      : state === 'degraded'
        ? 'ProfitEngine is partially reachable. Inspect the failing endpoints before trusting automation or revenue data.'
        : 'ProfitEngine Oracle runtime is not reachable from Vercel. Dashboard surface is live, but the core runtime still requires VM/network repair.';

  return {
    checkedAt: new Date().toISOString(),
    state,
    baseUrl,
    endpoints: results,
    summary
  };
}

export function buildProfitEngineResponse(status: ProfitEngineStatus) {
  return {
    service: 'profitengine',
    checkedAt: status.checkedAt,
    state: status.state,
    oracleBaseUrl: status.baseUrl,
    summary: status.summary,
    endpoints: status.endpoints,
    revenueIntegrity: 'No revenue is inferred or fabricated. Earnings require live platform confirmation.'
  };
}
