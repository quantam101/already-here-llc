import { DatabaseSync } from 'node:sqlite';
import { canonicalId, canonicalSlug } from './canonical-ids';
import type { CanonicalStore, DatabaseReadyWrite } from './canonical-store';

export interface MigrationSource {
  path: string;
  label?: string;
}

export interface MigrationRecord {
  table: string;
  legacyId: string;
  record: Record<string, unknown>;
  sourceLabel: string;
}

export interface MigrationReport {
  ok: boolean;
  sourceRecords: number;
  canonicalRecords: number;
  deduplicatedRecords: number;
  insertedIds: string[];
  failed: Array<{ table: string; id: string; error: string }>;
  sourceBreakdown: Record<string, number>;
  tableBreakdown: Record<string, number>;
}

const ID_PREFIX: Record<string, string> = {
  organizations: 'org',
  contacts: 'contact',
  leads: 'lead',
  opportunities: 'opp',
  jobs: 'job',
  dispatches: 'dispatch',
  quotes: 'quote',
  invoices: 'invoice',
  payments: 'payment',
  revenue_events: 'revenue',
  reviews: 'review',
  approval_actions: 'approval',
  ai_actions: 'aiaction',
  ai_runs: 'airun',
  ai_memory: 'aimemory',
  ai_feedback: 'aifeedback',
  proof_of_work: 'proof',
  vehicles: 'vehicle',
  repair_orders: 'repair',
  hauling_jobs: 'haul',
  procurement_targets: 'procurement',
  products: 'product',
  affiliate_links: 'affiliate',
  technicians: 'tech',
  vendors: 'vendor',
  route_stacks: 'route',
  routes: 'route',
};

const REFERENCE_TABLES: Record<string, string> = {
  organization_id: 'organizations',
  contact_id: 'contacts',
  lead_id: 'leads',
  opportunity_id: 'opportunities',
  job_id: 'jobs',
  dispatch_id: 'dispatches',
  quote_id: 'quotes',
  invoice_id: 'invoices',
  payment_id: 'payments',
  review_id: 'reviews',
  ai_action_id: 'ai_actions',
  ai_run_id: 'ai_runs',
  technician_id: 'technicians',
  vendor_id: 'vendors',
  vehicle_id: 'vehicles',
  repair_order_id: 'repair_orders',
  hauling_job_id: 'hauling_jobs',
  product_id: 'products',
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedEmail(value: unknown): string {
  return text(value).toLowerCase();
}

function normalizedPhone(value: unknown): string {
  return text(value).replace(/[^0-9+]/g, '');
}

function normalizedDomain(record: Record<string, unknown>): string {
  const explicit = text(record.domain).toLowerCase().replace(/^www\./, '');
  if (explicit) return explicit;
  const website = text(record.website || record.url);
  if (!website) return '';
  try {
    return new URL(website.includes('://') ? website : `https://${website}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function firstNonEmpty(record: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const value = text(record[field]);
    if (value) return value;
  }
  return '';
}

function naturalKey(table: string, record: Record<string, unknown>, legacyId: string): string {
  if (table === 'organizations') {
    const domain = normalizedDomain(record);
    if (domain) return `domain:${domain}`;
    const name = firstNonEmpty(record, ['name', 'organization_name', 'company', 'company_name']);
    if (name) return `name:${canonicalSlug(name)}`;
  }
  if (table === 'contacts') {
    const email = normalizedEmail(record.email);
    if (email) return `email:${email}`;
    const phone = normalizedPhone(record.phone || record.phone_number);
    if (phone) return `phone:${phone}`;
    const fullName = firstNonEmpty(record, ['full_name', 'name', 'contact_name']);
    const org = text(record.organization_id);
    if (fullName) return `name:${canonicalSlug(fullName)}:org:${org}`;
  }
  if (table === 'leads' || table === 'opportunities') {
    const sourceRecord = firstNonEmpty(record, ['source_record_id', 'external_id', 'message_id', 'source_id']);
    const source = firstNonEmpty(record, ['source_system', 'source', 'source_type']);
    if (sourceRecord) return `source:${canonicalSlug(source || 'unknown')}:${sourceRecord}`;
    const title = firstNonEmpty(record, ['title', 'subject', 'summary', 'service']);
    const contact = text(record.contact_id);
    const org = text(record.organization_id);
    if (title) return `title:${canonicalSlug(title)}:org:${org}:contact:${contact}`;
  }
  return `legacy:${legacyId}`;
}

function prefixFor(table: string): string {
  return ID_PREFIX[table] || canonicalSlug(table).slice(0, 16) || 'record';
}

function canonicalRecordId(table: string, record: Record<string, unknown>, legacyId: string): string {
  return canonicalId(prefixFor(table), table, naturalKey(table, record, legacyId));
}

function parseJson(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

type SqliteRow = Record<string, string | number | bigint | null | Uint8Array | undefined>;

function rowString(row: SqliteRow, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value : '';
}

function readSource(source: MigrationSource): MigrationRecord[] {
  const db = new DatabaseSync(source.path, { readOnly: true });
  const label = source.label?.trim() || source.path;
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('owned_records','canonical_records')")
      .all() as SqliteRow[];
    const names = new Set(tables.map((row) => rowString(row, 'name')));
    const records: MigrationRecord[] = [];

    if (names.has('owned_records')) {
      const rows = db
        .prepare('SELECT table_name, id, record_json FROM owned_records ORDER BY table_name, id')
        .all() as SqliteRow[];
      for (const row of rows) {
        const record = parseJson(rowString(row, 'record_json'));
        if (!record) continue;
        records.push({
          table: rowString(row, 'table_name'),
          legacyId: rowString(row, 'id'),
          record,
          sourceLabel: label,
        });
      }
    }

    if (names.has('canonical_records')) {
      const rows = db
        .prepare('SELECT table_name, id, payload FROM canonical_records ORDER BY table_name, id')
        .all() as SqliteRow[];
      for (const row of rows) {
        const record = parseJson(rowString(row, 'payload'));
        if (!record) continue;
        records.push({
          table: rowString(row, 'table_name'),
          legacyId: rowString(row, 'id'),
          record,
          sourceLabel: label,
        });
      }
    }

    return records;
  } finally {
    db.close();
  }
}

function isMeaningful(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function mergeRecords(current: Record<string, unknown> | undefined, incoming: Record<string, unknown>): Record<string, unknown> {
  if (!current) return { ...incoming };
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (isMeaningful(value) || !isMeaningful(merged[key])) merged[key] = value;
  }
  return merged;
}

function rewriteReferences(
  record: Record<string, unknown>,
  sourceLabel: string,
  idMap: Map<string, string>,
): Record<string, unknown> {
  const rewritten: Record<string, unknown> = { ...record };
  for (const [field, table] of Object.entries(REFERENCE_TABLES)) {
    const value = rewritten[field];
    if (typeof value !== 'string' || !value) continue;
    const mapped = idMap.get(`${sourceLabel}\u0000${table}\u0000${value}`);
    if (mapped) rewritten[field] = mapped;
  }
  return rewritten;
}

export async function combineOwnedDatabases(sources: MigrationSource[], target: CanonicalStore): Promise<MigrationReport> {
  if (!sources.length) {
    return {
      ok: true,
      sourceRecords: 0,
      canonicalRecords: 0,
      deduplicatedRecords: 0,
      insertedIds: [],
      failed: [],
      sourceBreakdown: {},
      tableBreakdown: {},
    };
  }

  const allRecords = sources.flatMap(readSource);
  const idMap = new Map<string, string>();
  const sourceBreakdown: Record<string, number> = {};
  for (const item of allRecords) {
    const id = canonicalRecordId(item.table, item.record, item.legacyId);
    idMap.set(`${item.sourceLabel}\u0000${item.table}\u0000${item.legacyId}`, id);
    sourceBreakdown[item.sourceLabel] = (sourceBreakdown[item.sourceLabel] || 0) + 1;
  }

  const merged = new Map<string, DatabaseReadyWrite>();
  const tableBreakdown: Record<string, number> = {};
  for (const item of allRecords) {
    const id = idMap.get(`${item.sourceLabel}\u0000${item.table}\u0000${item.legacyId}`);
    if (!id) continue;
    const rewritten = rewriteReferences(item.record, item.sourceLabel, idMap);
    const existing = merged.get(`${item.table}\u0000${id}`);
    const previousRecord = existing?.record;
    const migrationSources = new Set<string>([
      ...((Array.isArray(previousRecord?.migration_sources) ? previousRecord?.migration_sources : []) as string[]),
      item.sourceLabel,
    ]);
    const legacyIds = new Set<string>([
      ...((Array.isArray(previousRecord?.legacy_ids) ? previousRecord?.legacy_ids : []) as string[]),
      item.legacyId,
    ]);
    const record = mergeRecords(previousRecord, rewritten);
    record.id = id;
    record._canonical_id = id;
    record._legacy_id = item.legacyId;
    record.migration_sources = [...migrationSources];
    record.legacy_ids = [...legacyIds];
    record.source = text(record.source) || 'database_consolidation';
    record.migrated_at = new Date().toISOString();
    merged.set(`${item.table}\u0000${id}`, { table: item.table, id, action: 'insert', record });
  }

  const writes = [...merged.values()];
  for (const write of writes) tableBreakdown[write.table] = (tableBreakdown[write.table] || 0) + 1;
  const result = await target.executeWrites(writes);
  return {
    ok: result.ok,
    sourceRecords: allRecords.length,
    canonicalRecords: writes.length,
    deduplicatedRecords: allRecords.length - writes.length,
    insertedIds: result.insertedIds,
    failed: result.failed,
    sourceBreakdown,
    tableBreakdown,
  };
}
