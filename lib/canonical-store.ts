import { canonicalId } from './canonical-ids';

export interface DatabaseReadyWrite {
  table: string;
  id: string;
  action: 'insert' | 'upsert';
  record: Record<string, unknown>;
}

export interface AiRunInput {
  agentId: string;
  targetTable: string;
  targetId: string;
  action: string;
  recommendation?: string;
  confidence?: number;
  approvalRequired?: boolean;
  persistedExternally?: boolean;
  resultJson?: string;
  evidenceJson?: string;
  outcomeJson?: string;
  feedbackJson?: string;
  source?: string;
}

export interface ReviewActionInput {
  targetTable: string;
  targetId: string;
  action: string;
  decision?: string;
  persistedExternally?: boolean;
  approvalRequired?: boolean;
  reviewerContactId?: string;
  source?: string;
}

export interface WriteResult {
  ok: boolean;
  insertedIds: string[];
  failed: Array<{ table: string; id: string; error: string }>;
}

export interface CanonicalStore {
  executeWrites(writes: DatabaseReadyWrite[]): Promise<WriteResult>;
  recordAiRun(input: AiRunInput): Promise<string>;
  recordReviewAction(input: ReviewActionInput): Promise<string>;
  getRecord(table: string, id: string): Promise<Record<string, unknown> | undefined>;
  queryTable(table: string, limit?: number): Promise<Record<string, unknown>[]>;
  queryAll(limit?: number): Promise<Record<string, unknown>[]>;
  close(): void;
}

function defaultSqlitePath(): string {
  return process.env.CANONICAL_SQLITE_PATH?.trim() || 'data/canonical-graph.db';
}

function shouldUseSqlite(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.CANONICAL_STORE_TYPE === 'sqlite') return true;
  if (process.env.CANONICAL_STORE_TYPE === 'memory') return false;
  if (process.env.CANONICAL_SQLITE_PATH) return true;
  return false;
}

function shouldUseRemote(): { url: string; apiKey: string } | undefined {
  const url = process.env.OCI_CANONICAL_URL?.trim();
  const apiKey = process.env.OCI_CANONICAL_API_KEY?.trim();
  if (url && apiKey) return { url: url.replace(/\/$/, ''), apiKey };
  return undefined;
}

function isoNow(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeRecords(existing: Record<string, unknown> | undefined, incoming: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null) {
      if (!(key in merged)) merged[key] = value;
      continue;
    }
    // Preserve existing data when an optional field is submitted as an empty string.
    if (value === '') {
      if (!(key in merged)) merged[key] = value;
      continue;
    }
    // Union alias arrays across submissions instead of replacing them.
    if (key === 'aliases' && Array.isArray(merged[key]) && Array.isArray(value)) {
      merged[key] = Array.from(new Set([...(merged[key] as unknown[]), ...value]));
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

interface SqliteStatement {
  run(...args: unknown[]): unknown;
  get(...args: unknown[]): unknown;
  all(...args: unknown[]): unknown[];
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

function createBetterSqlite3Database(path: string): SqliteDatabase {
  const nodeModule = process.getBuiltinModule('node:module') as
    | { createRequire: (filename: string) => NodeRequire }
    | undefined;
  if (!nodeModule) {
    throw new Error('Cannot load better-sqlite3: node:module is unavailable');
  }
  const requireFn = nodeModule.createRequire('file://' + process.cwd() + '/lib/canonical-store.js');
  const BetterSqlite3 = requireFn('better-sqlite3') as new (path: string) => SqliteDatabase;
  return new BetterSqlite3(path);
}

function openSqliteDatabase(path: string): SqliteDatabase {
  const nodeSqlite = process.getBuiltinModule('node:sqlite') as
    | { DatabaseSync: new (path: string) => SqliteDatabase }
    | undefined;
  if (nodeSqlite?.DatabaseSync) {
    const db = new nodeSqlite.DatabaseSync(path);
    db.exec('PRAGMA journal_mode = WAL;');
    return db;
  }
  return createBetterSqlite3Database(path);
}

const MAX_MEMORY_RECORDS = 10_000;

class MemoryCanonicalStore implements CanonicalStore {
  private records: Map<string, Record<string, unknown>> = new Map();

  private key(table: string, id: string): string {
    return `${table}:${id}`;
  }

  private trimRecords(): void {
    while (this.records.size > MAX_MEMORY_RECORDS) {
      let oldestKey: string | undefined;
      let oldestTime = '';
      for (const [key, record] of this.records.entries()) {
        const createdAt = String(record.created_at ?? '');
        if (!oldestKey || createdAt.localeCompare(oldestTime) < 0) {
          oldestKey = key;
          oldestTime = createdAt;
        }
      }
      if (!oldestKey) break;
      this.records.delete(oldestKey);
    }
  }

  async executeWrites(writes: DatabaseReadyWrite[]): Promise<WriteResult> {
    const result: WriteResult = { ok: true, insertedIds: [], failed: [] };
    for (const write of writes) {
      try {
        const now = isoNow();
        const existing = write.action === 'upsert' ? this.records.get(this.key(write.table, write.id)) : undefined;
        const merged = mergeRecords(existing, write.record);
        const record: Record<string, unknown> = {
          ...merged,
          id: write.id,
          _table: write.table,
          _canonical_id: write.id,
          created_at: existing?.created_at ?? write.record['created_at'] ?? now,
          updated_at: now,
          source: write.record['source'] ?? existing?.source ?? write.table,
        };
        this.records.set(this.key(write.table, write.id), record);
        this.trimRecords();
        result.insertedIds.push(write.id);
      } catch (error) {
        result.failed.push({
          table: write.table,
          id: write.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    result.ok = result.failed.length === 0;
    return result;
  }

  async recordAiRun(input: AiRunInput): Promise<string> {
    const now = isoNow();
    const id = canonicalId('airun', input.agentId, input.targetTable, input.targetId, input.action, now);
    await this.executeWrites([
      {
        table: 'ai_runs',
        id,
        action: 'insert',
        record: {
          id,
          agent_id: input.agentId,
          target_table: input.targetTable,
          target_id: input.targetId,
          action: input.action,
          recommendation: input.recommendation ?? '',
          confidence: input.confidence ?? 0,
          approval_required: input.approvalRequired ? 1 : 0,
          persisted_externally: input.persistedExternally ? 1 : 0,
          result_json: input.resultJson ?? '{}',
          evidence_json: input.evidenceJson ?? '{}',
          outcome_json: input.outcomeJson ?? '{}',
          feedback_json: input.feedbackJson ?? '{}',
          source: input.source ?? 'ai_agent',
          created_at: now,
          updated_at: now,
        },
      },
    ]);
    return id;
  }

  async recordReviewAction(input: ReviewActionInput): Promise<string> {
    const now = isoNow();
    const id = canonicalId('review', input.targetTable, input.targetId, input.action, now);
    await this.executeWrites([
      {
        table: 'reviews',
        id,
        action: 'insert',
        record: {
          id,
          target_table: input.targetTable,
          target_id: input.targetId,
          action: input.action,
          decision: input.decision ?? 'queued',
          persisted_externally: input.persistedExternally ? 1 : 0,
          approval_required: input.approvalRequired ? 1 : 0,
          reviewer_contact_id: input.reviewerContactId ?? null,
          source: input.source ?? 'review_action',
          created_at: now,
          updated_at: now,
        },
      },
    ]);
    return id;
  }

  async getRecord(table: string, id: string): Promise<Record<string, unknown> | undefined> {
    const record = this.records.get(this.key(table, id));
    return record ? clone(record) : undefined;
  }

  async queryTable(table: string, limit = 1000): Promise<Record<string, unknown>[]> {
    const matched: Record<string, unknown>[] = [];
    for (const [key, record] of this.records.entries()) {
      if (key.startsWith(`${table}:`)) matched.push(record);
    }
    return clone(matched).sort(
      (left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''))
    ).slice(0, limit);
  }

  async queryAll(limit = 1000): Promise<Record<string, unknown>[]> {
    return clone([...this.records.values()]).sort(
      (left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''))
    ).slice(0, limit);
  }

  close(): void {
    this.records.clear();
  }
}

class SqliteCanonicalStore implements CanonicalStore {
  private db: SqliteDatabase;
  private insertStmt: SqliteStatement;

  constructor(path: string) {
    this.db = openSqliteDatabase(path);
    this.migrate();
    this.insertStmt = this.db.prepare(
      `INSERT OR REPLACE INTO canonical_records (id, table_name, payload, source, created_at, updated_at)
       VALUES ($id, $table_name, $payload, $source, $created_at, $updated_at)`
    );
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS canonical_records (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        payload TEXT NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_canonical_records_table ON canonical_records(table_name);
      CREATE INDEX IF NOT EXISTS idx_canonical_records_source ON canonical_records(source);
      CREATE INDEX IF NOT EXISTS idx_canonical_records_created ON canonical_records(created_at DESC);
    `);
  }

  async executeWrites(writes: DatabaseReadyWrite[]): Promise<WriteResult> {
    const result: WriteResult = { ok: true, insertedIds: [], failed: [] };
    const insert = this.insertStmt;
    const now = isoNow();
    for (const write of writes) {
      try {
        const existing = write.action === 'upsert' ? await this.getRecord(write.table, write.id) : undefined;
        const merged = mergeRecords(existing, write.record);
        const record: Record<string, unknown> = {
          ...merged,
          id: write.id,
          _table: write.table,
          _canonical_id: write.id,
          created_at: existing?.created_at ?? write.record['created_at'] ?? now,
          updated_at: now,
          source: write.record['source'] ?? existing?.source ?? write.table,
        };
        const createdAt = String(record['created_at'] ?? now);
        const updatedAt = String(record['updated_at'] ?? now);
        insert.run({
          id: write.id,
          table_name: write.table,
          payload: JSON.stringify(record),
          source: String(record['source'] ?? write.table),
          created_at: createdAt,
          updated_at: updatedAt,
        });
        result.insertedIds.push(write.id);
      } catch (error) {
        result.failed.push({
          table: write.table,
          id: write.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    result.ok = result.failed.length === 0;
    return result;
  }

  async recordAiRun(input: AiRunInput): Promise<string> {
    const now = isoNow();
    const id = canonicalId('airun', input.agentId, input.targetTable, input.targetId, input.action, now);
    await this.executeWrites([
      {
        table: 'ai_runs',
        id,
        action: 'insert',
        record: {
          id,
          agent_id: input.agentId,
          target_table: input.targetTable,
          target_id: input.targetId,
          action: input.action,
          recommendation: input.recommendation ?? '',
          confidence: input.confidence ?? 0,
          approval_required: input.approvalRequired ? 1 : 0,
          persisted_externally: input.persistedExternally ? 1 : 0,
          result_json: input.resultJson ?? '{}',
          evidence_json: input.evidenceJson ?? '{}',
          outcome_json: input.outcomeJson ?? '{}',
          feedback_json: input.feedbackJson ?? '{}',
          source: input.source ?? 'ai_agent',
          created_at: now,
          updated_at: now,
        },
      },
    ]);
    return id;
  }

  async recordReviewAction(input: ReviewActionInput): Promise<string> {
    const now = isoNow();
    const id = canonicalId('review', input.targetTable, input.targetId, input.action, now);
    await this.executeWrites([
      {
        table: 'reviews',
        id,
        action: 'insert',
        record: {
          id,
          target_table: input.targetTable,
          target_id: input.targetId,
          action: input.action,
          decision: input.decision ?? 'queued',
          persisted_externally: input.persistedExternally ? 1 : 0,
          approval_required: input.approvalRequired ? 1 : 0,
          reviewer_contact_id: input.reviewerContactId ?? null,
          source: input.source ?? 'review_action',
          created_at: now,
          updated_at: now,
        },
      },
    ]);
    return id;
  }

  async getRecord(table: string, id: string): Promise<Record<string, unknown> | undefined> {
    const row = this.db
      .prepare('SELECT payload FROM canonical_records WHERE table_name = ? AND id = ?')
      .get(table, id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as Record<string, unknown>) : undefined;
  }

  async queryTable(table: string, limit = 1000): Promise<Record<string, unknown>[]> {
    const rows = this.db
      .prepare('SELECT payload FROM canonical_records WHERE table_name = ? ORDER BY created_at DESC LIMIT ?')
      .all(table, limit) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as Record<string, unknown>);
  }

  async queryAll(limit = 1000): Promise<Record<string, unknown>[]> {
    const rows = this.db
      .prepare('SELECT payload FROM canonical_records ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as Record<string, unknown>);
  }

  close(): void {
    this.db.close();
  }
}

class RemoteCanonicalStore implements CanonicalStore {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error');
      throw new Error(`Remote canonical store GET ${path} failed: ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error');
      throw new Error(`Remote canonical store POST ${path} failed: ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  }

  async executeWrites(writes: DatabaseReadyWrite[]): Promise<WriteResult> {
    return this.post<WriteResult>('/write-many', { writes });
  }

  async recordAiRun(input: AiRunInput): Promise<string> {
    const now = isoNow();
    const id = canonicalId('airun', input.agentId, input.targetTable, input.targetId, input.action, now);
    await this.executeWrites([
      {
        table: 'ai_runs',
        id,
        action: 'insert',
        record: {
          id,
          agent_id: input.agentId,
          target_table: input.targetTable,
          target_id: input.targetId,
          action: input.action,
          recommendation: input.recommendation ?? '',
          confidence: input.confidence ?? 0,
          approval_required: input.approvalRequired ? 1 : 0,
          persisted_externally: input.persistedExternally ? 1 : 0,
          result_json: input.resultJson ?? '{}',
          evidence_json: input.evidenceJson ?? '{}',
          outcome_json: input.outcomeJson ?? '{}',
          feedback_json: input.feedbackJson ?? '{}',
          source: input.source ?? 'ai_agent',
          created_at: now,
          updated_at: now,
        },
      },
    ]);
    return id;
  }

  async recordReviewAction(input: ReviewActionInput): Promise<string> {
    const now = isoNow();
    const id = canonicalId('review', input.targetTable, input.targetId, input.action, now);
    await this.executeWrites([
      {
        table: 'reviews',
        id,
        action: 'insert',
        record: {
          id,
          target_table: input.targetTable,
          target_id: input.targetId,
          action: input.action,
          decision: input.decision ?? 'queued',
          persisted_externally: input.persistedExternally ? 1 : 0,
          approval_required: input.approvalRequired ? 1 : 0,
          reviewer_contact_id: input.reviewerContactId ?? null,
          source: input.source ?? 'review_action',
          created_at: now,
          updated_at: now,
        },
      },
    ]);
    return id;
  }

  async getRecord(table: string, id: string): Promise<Record<string, unknown> | undefined> {
    return this.get<Record<string, unknown> | undefined>(`/read/${encodeURIComponent(table)}/${encodeURIComponent(id)}`);
  }

  async queryTable(table: string, limit = 1000): Promise<Record<string, unknown>[]> {
    return this.get<Record<string, unknown>[]>(`/query/${encodeURIComponent(table)}?limit=${limit}`);
  }

  async queryAll(limit = 1000): Promise<Record<string, unknown>[]> {
    return this.get<Record<string, unknown>[]>(`/query?limit=${limit}`);
  }

  close(): void {
    // Remote store has no local resources to release.
  }
}

let sharedStore: CanonicalStore | undefined;

export function getCanonicalStore(): CanonicalStore {
  if (sharedStore) return sharedStore;
  const remoteConfig = shouldUseRemote();
  if (remoteConfig) {
    sharedStore = new RemoteCanonicalStore(remoteConfig.url, remoteConfig.apiKey);
    return sharedStore;
  }
  if (shouldUseSqlite()) {
    try {
      sharedStore = new SqliteCanonicalStore(defaultSqlitePath());
      return sharedStore;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`SQLite canonical store unavailable (${message}); falling back to memory.`);
    }
  }
  sharedStore = new MemoryCanonicalStore();
  return sharedStore;
}

export function resetCanonicalStore(): void {
  if (sharedStore) {
    sharedStore.close();
    sharedStore = undefined;
  }
}

export function buildGraphFromRecords(records: Record<string, unknown>[]): Record<string, Record<string, unknown>> {
  const byId = new Map<string, Record<string, unknown>>();
  for (const record of records) {
    const id = String(record._canonical_id ?? record.id ?? canonicalId('rec', JSON.stringify(record)));
    byId.set(id, record);
  }

  const graph: Record<string, Record<string, unknown>> = {};
  for (const [id, record] of byId.entries()) {
    const related: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(record)) {
      if (typeof value === 'string' && field.endsWith('_id') && field !== 'id' && field !== '_canonical_id') {
        const parent = byId.get(value);
        if (parent) {
          related[field] = parent;
        }
      }
    }
    graph[id] = { ...record, _related: related };
  }
  return graph;
}
