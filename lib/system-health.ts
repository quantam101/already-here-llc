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

export async function recordSystemHealthSignal(input: SystemHealthSignalInput): Promise<string> {
  const now = new Date().toISOString();
  const id = canonicalId('health', input.source, input.component, now);
  const store = getCanonicalStore();
  await store.executeWrites([
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

export async function querySystemHealthSignals(limit = 100): Promise<Record<string, unknown>[]> {
  return await getCanonicalStore().queryTable('system_health_signals', limit);
}
