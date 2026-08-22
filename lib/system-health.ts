import { canonicalId } from './canonical-ids';
import { getCanonicalStore } from './canonical-store';
import { safeCanonicalUpsert } from './canonical-upsert';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'not_configured' | 'unknown';
export type HealthComponent = 'build' | 'deployment' | 'runtime' | 'ai_primary' | 'ai_failover' | 'database' | 'queue' | 'integration' | 'ci_capacity' | 'mobile' | 'seo';

export interface SystemHealthSignalInput {
  source: string;
  component: HealthComponent | string;
  status: HealthStatus;
  environment?: 'production' | 'preview' | 'development' | string;
  message?: string;
  probeUrl?: string;
  failureClass?: string;
  recoveryState?: 'open' | 'recovering' | 'verified' | 'not_required' | string;
  evidence?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  observedAt?: string;
}

export interface SystemHealthSummary {
  overall: HealthStatus;
  byComponent: Record<string, HealthStatus>;
  latest: Record<string, Record<string, unknown>>;
  unhealthyCount: number;
  degradedCount: number;
  unknownCount: number;
}

const severity: Record<HealthStatus, number> = {
  healthy: 0,
  not_configured: 1,
  unknown: 2,
  degraded: 3,
  unhealthy: 4,
};

export async function recordSystemHealthSignal(input: SystemHealthSignalInput): Promise<string> {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const id = canonicalId('health', input.source, input.component, input.environment ?? 'unknown', observedAt);
  await safeCanonicalUpsert('system_health_signals', id, {
    source: input.source,
    component: input.component,
    environment: input.environment ?? 'production',
    status: input.status,
    message: input.message || '',
    probe_url: input.probeUrl || '',
    failure_class: input.failureClass || '',
    recovery_state: input.recoveryState || (input.status === 'healthy' ? 'verified' : 'open'),
    evidence_json: JSON.stringify(input.evidence ?? {}),
    metrics_json: JSON.stringify(input.metrics ?? {}),
    observed_at: observedAt,
    recorded_at: new Date().toISOString(),
  });
  return id;
}

export async function querySystemHealthSignals(limit = 100): Promise<Record<string, unknown>[]> {
  return getCanonicalStore().queryTable('system_health_signals', limit);
}

export async function buildSystemHealthSummary(limit = 1000): Promise<SystemHealthSummary> {
  const signals = await querySystemHealthSignals(limit);
  const latest: Record<string, Record<string, unknown>> = {};
  for (const signal of signals) {
    const key = `${String(signal.source ?? 'unknown')}:${String(signal.component ?? 'unknown')}:${String(signal.environment ?? 'production')}`;
    const observed = String(signal.observed_at ?? signal.recorded_at ?? signal.created_at ?? '');
    const current = latest[key];
    const currentObserved = String(current?.observed_at ?? current?.recorded_at ?? current?.created_at ?? '');
    if (!current || observed > currentObserved) latest[key] = signal;
  }

  const byComponent: Record<string, HealthStatus> = {};
  let overall: HealthStatus = Object.keys(latest).length ? 'healthy' : 'unknown';
  for (const signal of Object.values(latest)) {
    const component = String(signal.component ?? 'unknown');
    const status = (String(signal.status ?? 'unknown') as HealthStatus);
    const current = byComponent[component] ?? 'healthy';
    if ((severity[status] ?? severity.unknown) > (severity[current] ?? severity.unknown)) byComponent[component] = status;
    else if (!byComponent[component]) byComponent[component] = status;
    if ((severity[status] ?? severity.unknown) > severity[overall]) overall = status;
  }

  const statuses = Object.values(byComponent);
  return {
    overall,
    byComponent,
    latest,
    unhealthyCount: statuses.filter((status) => status === 'unhealthy').length,
    degradedCount: statuses.filter((status) => status === 'degraded').length,
    unknownCount: statuses.filter((status) => status === 'unknown' || status === 'not_configured').length,
  };
}
