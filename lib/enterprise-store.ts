import type { Database } from 'better-sqlite3';
import type { EnterpriseAgent, EnterpriseItem, EnterpriseOperation } from './global-enterprise-orchestrator';

type SqliteRow = Record<string, unknown>;

export interface EnterpriseEvent {
  eventId: string;
  agentId: string;
  operation: string;
  summary: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface EnterpriseStore {
  saveQueueItem(item: EnterpriseItem): void;
  getQueue(): EnterpriseItem[];
  getQueueByPriority(): EnterpriseItem[];
  updateQueueItem(itemId: string, patch: Partial<EnterpriseItem>): EnterpriseItem | undefined;
  appendEvent(event: EnterpriseEvent): void;
  getRecentEvents(limit?: number): EnterpriseEvent[];
  getStats(): { queueCount: number; p0: number; p1: number; p2: number; eventCount: number };
  close(): void;
}

function shouldUseSqlite(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.ENTERPRISE_STORE_TYPE === 'sqlite') return true;
  if (process.env.ENTERPRISE_STORE_TYPE === 'memory') return false;
  if (process.env.ENTERPRISE_SQLITE_PATH) return true;
  return false;
}

function defaultSqlitePath(): string {
  return process.env.ENTERPRISE_SQLITE_PATH || 'data/enterprise-asios.db';
}

class MemoryEnterpriseStore implements EnterpriseStore {
  private queue: EnterpriseItem[] = [];
  private events: EnterpriseEvent[] = [];

  saveQueueItem(item: EnterpriseItem): void {
    const existing = this.queue.find((entry) => entry.itemId === item.itemId);
    if (existing) {
      Object.assign(existing, item);
    } else {
      this.queue.push(item);
    }
  }

  getQueue(): EnterpriseItem[] {
    return [...this.queue];
  }

  getQueueByPriority(): EnterpriseItem[] {
    return [...this.queue].sort((left, right) => {
      const rank = { P0: 0, P1: 1, P2: 2 } as const;
      return rank[left.priority] - rank[right.priority] || right.estimatedValue - left.estimatedValue;
    });
  }

  updateQueueItem(itemId: string, patch: Partial<EnterpriseItem>): EnterpriseItem | undefined {
    const index = this.queue.findIndex((entry) => entry.itemId === itemId);
    if (index === -1) return undefined;
    const updated = { ...this.queue[index], ...patch } as EnterpriseItem;
    this.queue[index] = updated;
    return updated;
  }

  appendEvent(event: EnterpriseEvent): void {
    this.events.unshift(event);
    if (this.events.length > 10_000) this.events.pop();
  }

  getRecentEvents(limit = 100): EnterpriseEvent[] {
    return this.events.slice(0, limit);
  }

  getStats(): { queueCount: number; p0: number; p1: number; p2: number; eventCount: number } {
    const queue = this.getQueue();
    return {
      queueCount: queue.length,
      p0: queue.filter((i) => i.priority === 'P0').length,
      p1: queue.filter((i) => i.priority === 'P1').length,
      p2: queue.filter((i) => i.priority === 'P2').length,
      eventCount: this.events.length,
    };
  }

  close(): void {
    this.queue = [];
    this.events = [];
  }
}

class SqliteEnterpriseStore implements EnterpriseStore {
  private db: Database;

  constructor(path: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite3 = require('better-sqlite3') as new (path: string) => Database;
    this.db = new BetterSqlite3(path);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS enterprise_queue (
        itemId TEXT PRIMARY KEY,
        process TEXT NOT NULL,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        lane TEXT NOT NULL,
        priority TEXT NOT NULL,
        estimatedValue INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_queue_priority ON enterprise_queue(priority);
      CREATE INDEX IF NOT EXISTS idx_queue_status ON enterprise_queue(status);

      CREATE TABLE IF NOT EXISTS enterprise_events (
        eventId TEXT PRIMARY KEY,
        agentId TEXT NOT NULL,
        operation TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON enterprise_events(timestamp DESC);
    `);
  }

  saveQueueItem(item: EnterpriseItem): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      INSERT INTO enterprise_queue (itemId, process, source, title, body, lane, priority, estimatedValue, status, createdAt, updatedAt)
      VALUES (@itemId, @process, @source, @title, @body, @lane, @priority, @estimatedValue, @status, @createdAt, @updatedAt)
      ON CONFLICT(itemId) DO UPDATE SET
        process = excluded.process,
        source = excluded.source,
        title = excluded.title,
        body = excluded.body,
        lane = excluded.lane,
        priority = excluded.priority,
        estimatedValue = excluded.estimatedValue,
        status = excluded.status,
        updatedAt = excluded.updatedAt
    `
      )
      .run({
        itemId: item.itemId,
        process: item.process,
        source: item.source,
        title: item.title,
        body: item.body,
        lane: item.lane,
        priority: item.priority,
        estimatedValue: item.estimatedValue,
        status: item.status,
        createdAt: item.itemId.split('-').pop() || now,
        updatedAt: now,
      });
  }

  getQueue(): EnterpriseItem[] {
    const rows = this.db.prepare('SELECT * FROM enterprise_queue ORDER BY createdAt DESC').all() as SqliteRow[];
    return rows.map(this.rowToItem);
  }

  getQueueByPriority(): EnterpriseItem[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM enterprise_queue
      ORDER BY CASE priority
        WHEN 'P0' THEN 0
        WHEN 'P1' THEN 1
        WHEN 'P2' THEN 2
        ELSE 3
      END, estimatedValue DESC
    `
      )
      .all() as SqliteRow[];
    return rows.map(this.rowToItem);
  }

  updateQueueItem(itemId: string, patch: Partial<EnterpriseItem>): EnterpriseItem | undefined {
    const existing = this.db.prepare('SELECT * FROM enterprise_queue WHERE itemId = ?').get(itemId) as SqliteRow | undefined;
    if (!existing) return undefined;
    const updated = { ...this.rowToItem(existing), ...patch } as EnterpriseItem;
    this.saveQueueItem(updated);
    return updated;
  }

  appendEvent(event: EnterpriseEvent): void {
    this.db
      .prepare(
        `
      INSERT INTO enterprise_events (eventId, agentId, operation, summary, payload, timestamp)
      VALUES (@eventId, @agentId, @operation, @summary, @payload, @timestamp)
    `
      )
      .run({
        eventId: event.eventId,
        agentId: event.agentId,
        operation: event.operation,
        summary: event.summary,
        payload: JSON.stringify(event.payload),
        timestamp: event.timestamp,
      });
  }

  getRecentEvents(limit = 100): EnterpriseEvent[] {
    const rows = this.db.prepare('SELECT * FROM enterprise_events ORDER BY timestamp DESC LIMIT ?').all(limit) as SqliteRow[];
    return rows.map((row) => ({
      eventId: String(row.eventId),
      agentId: String(row.agentId),
      operation: String(row.operation),
      summary: String(row.summary),
      payload: JSON.parse(String(row.payload)) as Record<string, unknown>,
      timestamp: String(row.timestamp),
    }));
  }

  getStats(): { queueCount: number; p0: number; p1: number; p2: number; eventCount: number } {
    const row = this.db
      .prepare(
        `
      SELECT
        COUNT(*) as queueCount,
        SUM(CASE WHEN priority = 'P0' THEN 1 ELSE 0 END) as p0,
        SUM(CASE WHEN priority = 'P1' THEN 1 ELSE 0 END) as p1,
        SUM(CASE WHEN priority = 'P2' THEN 1 ELSE 0 END) as p2,
        (SELECT COUNT(*) FROM enterprise_events) as eventCount
      FROM enterprise_queue
    `
      )
      .get() as SqliteRow | undefined;
    if (!row) {
      return { queueCount: 0, p0: 0, p1: 0, p2: 0, eventCount: 0 };
    }
    return {
      queueCount: Number(row.queueCount) || 0,
      p0: Number(row.p0) || 0,
      p1: Number(row.p1) || 0,
      p2: Number(row.p2) || 0,
      eventCount: Number(row.eventCount) || 0,
    };
  }

  close(): void {
    this.db.close();
  }

  private rowToItem(row: SqliteRow): EnterpriseItem {
    return {
      itemId: String(row.itemId),
      process: String(row.process) as EnterpriseItem['process'],
      source: String(row.source),
      title: String(row.title),
      body: String(row.body),
      lane: String(row.lane),
      priority: String(row.priority) as EnterpriseItem['priority'],
      estimatedValue: Number(row.estimatedValue),
      status: String(row.status) as EnterpriseItem['status'],
    };
  }
}

let sharedStore: EnterpriseStore | undefined;

export function getEnterpriseStore(): EnterpriseStore {
  if (sharedStore) return sharedStore;
  if (shouldUseSqlite()) {
    sharedStore = new SqliteEnterpriseStore(defaultSqlitePath());
    return sharedStore;
  }
  sharedStore = new MemoryEnterpriseStore();
  return sharedStore;
}

export function resetEnterpriseStore(): void {
  if (sharedStore) {
    sharedStore.close();
    sharedStore = undefined;
  }
}

export function createEnterpriseEvent(agent: EnterpriseAgent, operation: EnterpriseOperation, summary: string, payload: Record<string, unknown>): EnterpriseEvent {
  return {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    agentId: agent.id,
    operation,
    summary,
    payload,
    timestamp: new Date().toISOString(),
  };
}
