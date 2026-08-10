import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatabaseReadyWrite } from './revenue-command-intake';

const DEFAULT_DB_PATH = 'data/revenue-command.sqlite3';
const SCHEMA_VERSION = 2;

export const ALLOWED_TABLES = new Set([
  'organizations',
  'contacts',
  'leads',
  'opportunities',
  'opportunity_sources',
  'opportunity_scores',
  'jobs',
  'dispatches',
  'route_stacks',
  'quotes',
  'invoices',
  'payments',
  'revenue_events',
  'repeating_customers',
  'technicians',
  'vendors',
  'vehicles',
  'repair_orders',
  'hauling_jobs',
  'routes',
  'procurement_targets',
  'products',
  'affiliate_links',
  'conversations',
  'reviews',
  'approval_actions',
  'revenue_agents',
  'ai_actions',
  'ai_conversations',
  'ai_memory',
  'ai_feedback',
  'ai_tasks',
  'ai_goals',
  'ai_runs',
  'outcomes',
  'analytics_events',
  'audit_logs',
  'proof_of_work',
  'codex_changelog',
  'engineering_events',
  'verification_history',
  'catch_correct_events',
  'system_health_signals',
  'roles',
  'permissions',
  'user_roles',
  'security_findings'
]);

type OwnedRecord = Record<string, unknown>;
type Store = Record<string, Record<string, OwnedRecord>>;

let database: Database.Database | null = null;
let databasePath: string | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

function defaultDatabasePath(): string {
  if (process.env.VERCEL || process.env.VERCEL_ENV) return '/tmp/revenue-command.sqlite3';
  return join(process.cwd(), DEFAULT_DB_PATH);
}

export function getDatabasePath(): string {
  return process.env.REVENUE_COMMAND_DB_PATH || defaultDatabasePath();
}

function ensureDirectory(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function initialize(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS revenue_command_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS owned_records (
      table_name TEXT NOT NULL,
      id TEXT NOT NULL,
      record_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (table_name, id)
    );
    CREATE INDEX IF NOT EXISTS idx_owned_records_table_created
      ON owned_records(table_name, created_at DESC);
  `);
  db.prepare(`
    INSERT INTO revenue_command_meta(key, value, updated_at)
    VALUES ('schema_version', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(String(SCHEMA_VERSION), new Date().toISOString());
}

function getDatabase(): Database.Database {
  const path = getDatabasePath();
  if (database && databasePath === path) return database;
  if (database) database.close();
  ensureDirectory(path);
  database = new Database(path);
  databasePath = path;
  initialize(database);
  return database;
}

function isAllowedTable(name: string): boolean {
  return ALLOWED_TABLES.has(name);
}

function normalizeRecord(write: DatabaseReadyWrite): OwnedRecord {
  const now = new Date().toISOString();
  return {
    ...write.record,
    id: write.id,
    created_at: write.record.created_at || now,
    updated_at: write.record.updated_at || now
  };
}

async function lockedPersist(writes: DatabaseReadyWrite[]): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  const accepted: DatabaseReadyWrite[] = [];

  for (const write of writes) {
    if (!isAllowedTable(write.table)) {
      errors.push(`Rejected unknown table: ${write.table}`);
      continue;
    }
    if (write.action !== 'insert') {
      errors.push(`Unsupported action ${write.action} for table ${write.table}`);
      continue;
    }
    accepted.push(write);
  }

  if (!accepted.length) return { inserted: 0, errors };

  try {
    const db = getDatabase();
    const upsert = db.prepare(`
      INSERT INTO owned_records(table_name, id, record_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(table_name, id) DO UPDATE SET
        record_json = excluded.record_json,
        updated_at = excluded.updated_at
    `);
    const transaction = db.transaction((batch: DatabaseReadyWrite[]) => {
      for (const write of batch) {
        const record = normalizeRecord(write);
        upsert.run(
          write.table,
          write.id,
          JSON.stringify(record),
          String(record.created_at),
          String(record.updated_at)
        );
      }
    });
    transaction(accepted);
    return { inserted: accepted.length, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { inserted: 0, errors };
  }
}

export function persistDatabaseReadyWrites(writes: DatabaseReadyWrite[]): Promise<{ inserted: number; errors: string[] }> {
  const task = writeQueue.then(() => lockedPersist(writes));
  writeQueue = task.catch(() => undefined);
  return task as Promise<{ inserted: number; errors: string[] }>;
}

function parseRecord(value: unknown): OwnedRecord | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as OwnedRecord : undefined;
  } catch {
    return undefined;
  }
}

export function listRecords(table: string, limit = 100): OwnedRecord[] {
  if (!isAllowedTable(table)) return [];
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 5000);
  const rows = getDatabase().prepare(`
    SELECT record_json FROM owned_records
    WHERE table_name = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(table, safeLimit) as Array<{ record_json: string }>;
  return rows.map((row) => parseRecord(row.record_json)).filter((row): row is OwnedRecord => Boolean(row));
}

export function getRecord(table: string, id: string): OwnedRecord | undefined {
  if (!isAllowedTable(table)) return undefined;
  const row = getDatabase().prepare(`
    SELECT record_json FROM owned_records WHERE table_name = ? AND id = ?
  `).get(table, id) as { record_json?: string } | undefined;
  return parseRecord(row?.record_json);
}

export function findRecordBy(table: string, field: string, value: unknown): OwnedRecord | undefined {
  if (!isAllowedTable(table)) return undefined;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) return undefined;
  const row = getDatabase().prepare(`
    SELECT record_json FROM owned_records
    WHERE table_name = ? AND json_extract(record_json, ?) = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(table, `$.${field}`, value as string | number | null) as { record_json?: string } | undefined;
  return parseRecord(row?.record_json);
}

export function countRecords(_store: Store | undefined, table: string): number {
  if (!isAllowedTable(table)) return 0;
  const row = getDatabase().prepare(`
    SELECT COUNT(*) AS count FROM owned_records WHERE table_name = ?
  `).get(table) as { count: number };
  return Number(row.count || 0);
}

export function getDatabaseStats(): Record<string, number> {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT table_name, COUNT(*) AS count
    FROM owned_records
    GROUP BY table_name
  `).all() as Array<{ table_name: string; count: number }>;
  const counts = new Map(rows.map((row) => [row.table_name, Number(row.count)]));
  const result: Record<string, number> = {};
  for (const table of ALLOWED_TABLES) result[table] = counts.get(table) || 0;
  return result;
}

export function getDatabaseHealth(): {
  driver: 'sqlite';
  path: string;
  durable: boolean;
  schemaVersion: number;
  journalMode: string;
  recordCount: number;
  warning?: string;
} {
  const db = getDatabase();
  const path = getDatabasePath();
  const recordRow = db.prepare('SELECT COUNT(*) AS count FROM owned_records').get() as { count: number };
  const journalRow = db.pragma('journal_mode', { simple: true });
  const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const ephemeral = onVercel || path.startsWith('/tmp/');
  return {
    driver: 'sqlite',
    path,
    durable: !ephemeral,
    schemaVersion: SCHEMA_VERSION,
    journalMode: String(journalRow || 'unknown'),
    recordCount: Number(recordRow.count || 0),
    ...(ephemeral ? { warning: 'SQLite is running on ephemeral storage. Use the OCI/persistent backend as the authoritative store before production data is trusted.' } : {})
  };
}

export function readStore(_path = getDatabasePath()): Store {
  const store: Store = {};
  for (const table of ALLOWED_TABLES) {
    const records = listRecords(table, 5000);
    if (records.length) {
      store[table] = Object.fromEntries(records.map((record) => [String(record.id), record]));
    }
  }
  return store;
}

export function closeDatabase(): void {
  if (database) database.close();
  database = null;
  databasePath = null;
}
