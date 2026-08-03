import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatabaseReadyWrite } from './revenue-command-intake';

const DEFAULT_DB_PATH = 'data/revenue-command.json';

const ALLOWED_TABLES = new Set([
  'organizations',
  'contacts',
  'leads',
  'opportunities',
  'jobs',
  'dispatches',
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
  'revenue_agents',
  'ai_actions',
  'analytics_events',
  'audit_logs',
  'proof_of_work',
  'codex_changelog',
  'catch_correct_events',
  'system_health_signals'
]);

type Store = Record<string, Record<string, Record<string, unknown>>>;

export function getDatabasePath(): string {
  return process.env.REVENUE_COMMAND_DB_PATH || join(process.cwd(), DEFAULT_DB_PATH);
}

function ensureDirectory(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readStore(path: string): Store {
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function writeStore(path: string, store: Store): void {
  ensureDirectory(path);
  const temp = `${path}.tmp`;
  writeFileSync(temp, JSON.stringify(store, null, 2));
  renameSync(temp, path);
}

function isAllowedTable(name: string): boolean {
  return ALLOWED_TABLES.has(name);
}

export function persistDatabaseReadyWrites(writes: DatabaseReadyWrite[]): { inserted: number; errors: string[] } {
  const path = getDatabasePath();
  const errors: string[] = [];
  let inserted = 0;

  const store = readStore(path);

  for (const write of writes) {
    if (!isAllowedTable(write.table)) {
      errors.push(`Rejected unknown table: ${write.table}`);
      continue;
    }
    if (write.action !== 'insert') {
      errors.push(`Unsupported action ${write.action} for table ${write.table}`);
      continue;
    }
    if (!store[write.table]) {
      store[write.table] = {};
    }
    store[write.table][write.id] = write.record;
    inserted += 1;
  }

  try {
    writeStore(path, store);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { inserted: 0, errors };
  }

  return { inserted, errors };
}

function getTable(table: string): Record<string, Record<string, unknown>> {
  return readStore(getDatabasePath())[table] || {};
}

function byCreatedAtDesc(left: Record<string, unknown>, right: Record<string, unknown>): number {
  const leftTime = String(left.created_at || '');
  const rightTime = String(right.created_at || '');
  return rightTime.localeCompare(leftTime);
}

export function listRecords(table: string, limit = 100): Record<string, unknown>[] {
  if (!isAllowedTable(table)) return [];
  return Object.values(getTable(table)).sort(byCreatedAtDesc).slice(0, limit);
}

export function getRecord(table: string, id: string): Record<string, unknown> | undefined {
  if (!isAllowedTable(table)) return undefined;
  return getTable(table)[id];
}

export function countRecords(table: string): number {
  if (!isAllowedTable(table)) return 0;
  return Object.keys(getTable(table)).length;
}

export function getDatabaseStats(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const table of ALLOWED_TABLES) {
    result[table] = countRecords(table);
  }
  return result;
}

export function closeDatabase(): void {
  // No-op for file-backed store; exists for API parity with SQLite-based drivers.
}
