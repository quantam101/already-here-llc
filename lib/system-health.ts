import { canonicalId } from './canonical-ids';
import { getCanonicalStore } from './canonical-store';

export interface SystemHealthSignalInput {
  source: string;
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured';
  message?: string;
  probeUrl?: string;
  metrics?: Record<string, unknown>;
}

export function recordSystemHealthSignal(input: SystemHealthSignalInput) {
  const now = new Date().toISOString();
  const id = canonicalId('health', input.source, input.component, now);
  const store = getCanonicalStore();
  store.executeWrites([
    {
      table: 'system_health_signals',
      id,
      action: 'insert',
      record: {
        id,
        source: input.source,
        component: input.component,
        status: input.status,
        message: input.message || '',
        probe_url: input.probeUrl || '',
        metrics_json: JSON.stringify(input.metrics ?? {}),
        recorded_at: now,
        created_at: now,
        updated_at: now,
      },
    },
  ]);
  return id;
}

export function querySystemHealthSignals(limit = 100) {
  return getCanonicalStore().queryTable('system_health_signals', limit);
}
