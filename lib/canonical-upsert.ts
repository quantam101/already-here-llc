import type { CanonicalStore } from './canonical-store';
import { getCanonicalStore } from './canonical-store';

export type CanonicalRecord = Record<string, unknown>;

function mergeArrays(left: unknown[], right: unknown[]): unknown[] {
  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const value of [...left, ...right]) {
    const key = typeof value === 'string' ? `s:${value}` : JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
}

export function mergeCanonicalRecords(existing: CanonicalRecord | undefined, incoming: CanonicalRecord): CanonicalRecord {
  const merged: CanonicalRecord = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && Array.isArray(merged[key])) {
      merged[key] = mergeArrays(merged[key] as unknown[], value);
      continue;
    }
    if (typeof value === 'string' && value.trim() === '' && merged[key] !== undefined && merged[key] !== '') continue;
    merged[key] = value;
  }
  if (existing?.created_at) merged.created_at = existing.created_at;
  return merged;
}

export async function safeCanonicalUpsert(
  table: string,
  id: string,
  incoming: CanonicalRecord,
  store: CanonicalStore = getCanonicalStore(),
): Promise<CanonicalRecord> {
  const existing = await store.getRecord(table, id);
  const now = new Date().toISOString();
  const record = mergeCanonicalRecords(existing, {
    ...incoming,
    id,
    _canonical_id: id,
    _table: table,
    created_at: incoming.created_at ?? existing?.created_at ?? now,
    updated_at: now,
  });
  const result = await store.executeWrites([{ table, id, action: 'insert', record }]);
  if (!result.ok) throw new Error(result.failed.map((item) => item.error).join('; ') || `Failed to upsert ${table}:${id}`);
  return record;
}
