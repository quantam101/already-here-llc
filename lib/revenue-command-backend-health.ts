import { createHash } from 'node:crypto';
import { persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface BackendProbeConfig {
  baseUrl: string;
  service?: string;
  timeoutMs?: number;
  authHeaderValue?: string;
  observedAt?: string;
}

export interface BackendProbeResult {
  ok: boolean;
  service: string;
  baseUrl: string;
  healthz: { ok: boolean; status?: number; latencyMs?: number; error?: string };
  readyz: { ok: boolean; status?: number; latencyMs?: number; error?: string };
  state: 'healthy' | 'degraded' | 'failing';
  observedAt: string;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

async function probe(url: string, timeoutMs: number, authHeaderValue?: string, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; status?: number; latencyMs?: number; error?: string }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: authHeaderValue ? { Authorization: authHeaderValue } : undefined,
      cache: 'no-store',
      signal: controller.signal
    });
    return { ok: response.ok, status: response.status, latencyMs: Date.now() - started, ...(response.ok ? {} : { error: `HTTP ${response.status}` }) };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeBackend(config: BackendProbeConfig, fetchImpl: typeof fetch = fetch): Promise<BackendProbeResult> {
  const parsed = new URL(config.baseUrl);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Backend health URL must use HTTP(S)');
  const base = parsed.toString().replace(/\/$/, '');
  const timeoutMs = Math.min(Math.max(config.timeoutMs || 5000, 500), 15000);
  const [healthz, readyz] = await Promise.all([
    probe(`${base}/healthz`, timeoutMs, config.authHeaderValue, fetchImpl),
    probe(`${base}/readyz`, timeoutMs, config.authHeaderValue, fetchImpl)
  ]);
  const state: BackendProbeResult['state'] = healthz.ok && readyz.ok ? 'healthy' : healthz.ok || readyz.ok ? 'degraded' : 'failing';
  return { ok: state === 'healthy', service: config.service || 'oci-backend', baseUrl: base, healthz, readyz, state, observedAt: config.observedAt || new Date().toISOString() };
}

export async function persistBackendProbe(result: BackendProbeResult): Promise<{ ok: boolean; inserted: number; errors: string[]; id: string }> {
  const id = stableId('health', `${result.service}:${result.observedAt}`);
  const writes: DatabaseReadyWrite[] = [{
    table: 'system_health_signals', id, action: 'insert', record: {
      id,
      platform: 'OCI',
      repo_or_service: result.service,
      signal_type: 'backend_readiness_probe',
      state: result.state,
      severity: result.state === 'healthy' ? 'low' : result.state === 'degraded' ? 'medium' : 'high',
      next_fix: result.state === 'healthy' ? null : 'Inspect backend process, database connectivity, firewall, and restart/recovery path.',
      details_json: JSON.stringify(result),
      created_at: result.observedAt,
      updated_at: result.observedAt
    }
  }, {
    table: 'verification_history', id: stableId('verify', `${id}:backend`), action: 'insert', record: {
      id: stableId('verify', `${id}:backend`),
      target_type: 'backend',
      target_id: result.service,
      verification_type: 'healthz_readyz',
      status: result.state,
      evidence_json: JSON.stringify(result),
      created_at: result.observedAt,
      updated_at: result.observedAt
    }
  }];
  const saved = await persistDatabaseReadyWrites(writes);
  return { ok: saved.errors.length === 0, inserted: saved.inserted, errors: saved.errors, id };
}

export async function probeConfiguredOciBackend(fetchImpl: typeof fetch = fetch): Promise<{ configured: boolean; result?: BackendProbeResult; persisted?: { ok: boolean; inserted: number; errors: string[]; id: string } }> {
  const baseUrl = process.env.OCI_BACKEND_BASE_URL || '';
  if (!baseUrl) return { configured: false };
  const result = await probeBackend({ baseUrl, service: process.env.OCI_BACKEND_SERVICE || 'already-here-oci-backend', authHeaderValue: process.env.OCI_BACKEND_HEALTH_TOKEN ? `Bearer ${process.env.OCI_BACKEND_HEALTH_TOKEN}` : undefined }, fetchImpl);
  return { configured: true, result, persisted: await persistBackendProbe(result) };
}
