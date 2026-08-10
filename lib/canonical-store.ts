import type { Database, Statement } from 'better-sqlite3';
import { canonicalId } from './canonical-ids';

export interface DatabaseReadyWrite {
  table: string;
  id: string;
  action: 'insert';
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
  executeWrites(writes: DatabaseReadyWrite[]): WriteResult;
  recordAiRun(input: AiRunInput): string;
  recordReviewAction(input: ReviewActionInput): string;
  getRecord(table: string, id: string): Record<string, unknown> | undefined;
  queryTable(table: string, limit?: number): Record<string, unknown>[];
  queryAll(limit?: number): Record<string, unknown>[];
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

function isoNow(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

  executeWrites(writes: DatabaseReadyWrite[]): WriteResult {
    const result: WriteResult = { ok: true, insertedIds: [], failed: [] };
    for (const write of writes) {
      try {
        const now = isoNow();
        const record: Record<string, unknown> = {
          ...write.record,
          id: write.id,
          _table: write.table,
          _canonical_id: write.id,
          created_at: write.record['created_at'] ?? now,
          updated_at: now,
          source: write.record['source'] ?? write.table,
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

  recordAiRun(input: AiRunInput): string {
    const now = isoNow();
    const id = canonicalId('airun', input.agentId, input.targetTable, input.targetId, input.action, now);
    const write: DatabaseReadyWrite = {
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
    };
    this.executeWrites([write]);
    return id;
  }

  recordReviewAction(input: ReviewActionInput): string {
    const now = isoNow();
    const id = canonicalId('review', input.targetTable, input.targetId, input.action, now);
    const write: DatabaseReadyWrite = {
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
    };
    this.executeWrites([write]);
    return id;
  }

  getRecord(table: string, id: string): Record<string, unknown> | undefined {
    const record = this.records.get(this.key(table, id));
    return record ? clone(record) : undefined;
  }

  queryTable(table: string, limit = 1000): Record<string, unknown>[] {
    const matched: Record<string, unknown>[] = [];
    for (const [key, record] of this.records.entries()) {
      if (key.startsWith(`${table}:`)) matched.push(record);
    }
    return clone(matched).sort(
      (left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''))
    ).slice(0, limit);
  }

  queryAll(limit = 1000): Record<string, unknown>[] {
    return clone([...this.records.values()]).sort(
      (left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''))
    ).slice(0, limit);
  }

  close(): void {
    this.records.clear();
  }
}

class SqliteCanonicalStore implements CanonicalStore {
  private db: Database;
  private insertStmt: Statement<unknown[]>;

  constructor(path: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite3 = require('better-sqlite3') as new (path: string) => Database;
    this.db = new BetterSqlite3(path);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
    this.insertStmt = this.db.prepare(
      `INSERT OR REPLACE INTO canonical_records (id, table_name, payload, source, created_at, updated_at)
       VALUES (@id, @table_name, @payload, @source, @created_at, @updated_at)`
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

  executeWrites(writes: DatabaseReadyWrite[]): WriteResult {
    const result: WriteResult = { ok: true, insertedIds: [], failed: [] };
    const insert = this.insertStmt;
    const now = isoNow();
    for (const write of writes) {
      try {
        const record: Record<string, unknown> = {
          ...write.record,
          id: write.id,
          _table: write.table,
          _canonical_id: write.id,
          created_at: write.record['created_at'] ?? now,
          updated_at: now,
          source: write.record['source'] ?? write.table,
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

  recordAiRun(input: AiRunInput): string {
    const now = isoNow();
    const id = canonicalId('airun', input.agentId, input.targetTable, input.targetId, input.action, now);
    this.executeWrites([
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

  recordReviewAction(input: ReviewActionInput): string {
    const now = isoNow();
    const id = canonicalId('review', input.targetTable, input.targetId, input.action, now);
    this.executeWrites([
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

  getRecord(table: string, id: string): Record<string, unknown> | undefined {
    const row = this.db
      .prepare('SELECT payload FROM canonical_records WHERE table_name = ? AND id = ?')
      .get(table, id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as Record<string, unknown>) : undefined;
  }

  queryTable(table: string, limit = 1000): Record<string, unknown>[] {
    const rows = this.db
      .prepare('SELECT payload FROM canonical_records WHERE table_name = ? ORDER BY created_at DESC LIMIT ?')
      .all(table, limit) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as Record<string, unknown>);
  }

  queryAll(limit = 1000): Record<string, unknown>[] {
    const rows = this.db
      .prepare('SELECT payload FROM canonical_records ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as Record<string, unknown>);
  }

  close(): void {
    this.db.close();
  }
}

let sharedStore: CanonicalStore | undefined;

export function getCanonicalStore(): CanonicalStore {
  if (sharedStore) return sharedStore;
  if (shouldUseSqlite()) {
    sharedStore = new SqliteCanonicalStore(defaultSqlitePath());
    return sharedStore;
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
