import type { DatabaseReadyWrite } from './canonical-store';

export interface OciCanonicalConfig {
  baseUrl: string;
  apiKey: string;
}

export interface OciWriteResult {
  ok: boolean;
  insertedIds: string[];
  failed: Array<{ table: string; id: string; error: string }>;
}

function getConfig(): OciCanonicalConfig | undefined {
  const baseUrl = process.env.OCI_CANONICAL_URL?.trim();
  const apiKey = process.env.OCI_CANONICAL_API_KEY?.trim();
  if (!baseUrl || !apiKey) return undefined;
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

function headers(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };
}

export async function ociHealthCheck(): Promise<Record<string, unknown> | undefined> {
  const config = getConfig();
  if (!config) return undefined;
  const res = await fetch(`${config.baseUrl}/health`, { headers: headers(config.apiKey) });
  if (!res.ok) return undefined;
  return (await res.json()) as Record<string, unknown>;
}

export async function ociWriteMany(writes: DatabaseReadyWrite[]): Promise<OciWriteResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, insertedIds: [], failed: writes.map((w) => ({ table: w.table, id: w.id, error: 'OCI canonical config missing' })) };
  }
  const res = await fetch(`${config.baseUrl}/write-many`, {
    method: 'POST',
    headers: headers(config.apiKey),
    body: JSON.stringify({ writes }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error');
    return { ok: false, insertedIds: [], failed: writes.map((w) => ({ table: w.table, id: w.id, error: `HTTP ${res.status}: ${text}` })) };
  }
  const data = (await res.json()) as { ok: boolean; insertedIds: string[]; failed?: Array<{ table: string; id: string; error: string }> };
  return {
    ok: data.ok && (data.failed?.length ?? 0) === 0,
    insertedIds: data.insertedIds,
    failed: data.failed ?? [],
  };
}

export async function ociReadRecord(table: string, id: string): Promise<Record<string, unknown> | undefined> {
  const config = getConfig();
  if (!config) return undefined;
  const res = await fetch(`${config.baseUrl}/read/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
    headers: headers(config.apiKey),
  });
  if (!res.ok) return undefined;
  return (await res.json()) as Record<string, unknown>;
}

export async function ociQueryTable(table: string, limit = 1000): Promise<Record<string, unknown>[]> {
  const config = getConfig();
  if (!config) return [];
  const res = await fetch(`${config.baseUrl}/query/${encodeURIComponent(table)}?limit=${limit}`, {
    headers: headers(config.apiKey),
  });
  if (!res.ok) return [];
  return (await res.json()) as Record<string, unknown>[];
}

export async function ociQueryAll(limit = 1000): Promise<Record<string, unknown>[]> {
  const config = getConfig();
  if (!config) return [];
  const res = await fetch(`${config.baseUrl}/query?limit=${limit}`, { headers: headers(config.apiKey) });
  if (!res.ok) return [];
  return (await res.json()) as Record<string, unknown>[];
}

export async function ociBackup(): Promise<Record<string, unknown> | undefined> {
  const config = getConfig();
  if (!config) return undefined;
  const res = await fetch(`${config.baseUrl}/backup`, { method: 'POST', headers: headers(config.apiKey) });
  if (!res.ok) return undefined;
  return (await res.json()) as Record<string, unknown>;
}

export async function ociRestore(backupName: string): Promise<Record<string, unknown> | undefined> {
  const config = getConfig();
  if (!config) return undefined;
  const res = await fetch(`${config.baseUrl}/restore/${encodeURIComponent(backupName)}`, {
    method: 'POST',
    headers: headers(config.apiKey),
  });
  if (!res.ok) return undefined;
  return (await res.json()) as Record<string, unknown>;
}
