import { createHash } from 'node:crypto';
import { persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

function hashId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function now(): string {
  return new Date().toISOString();
}

export interface CodexChangelogEntry {
  commitHash: string;
  author: string;
  message: string;
  branch?: string;
  tags?: string[];
  deploymentStatus?: 'pending' | 'success' | 'failure' | 'rollback';
}

export interface SystemHealthSignal {
  service: string;
  status: 'healthy' | 'degraded' | 'failing' | 'unknown';
  reason: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
  recommendation?: string;
}

export interface CatchCorrectEvent {
  module: string;
  errorSummary: string;
  correction: string;
  rule: string;
  severity?: 'low' | 'medium' | 'high';
}

export function buildCodexChangelogWrites(entry: CodexChangelogEntry): DatabaseReadyWrite[] {
  const id = hashId('codex', `${entry.commitHash}:${now()}`);
  return [{
    table: 'codex_changelog',
    id,
    action: 'insert',
    record: {
      id,
      commit_hash: entry.commitHash,
      author: entry.author,
      message: entry.message,
      branch: entry.branch || 'main',
      tags_json: JSON.stringify(entry.tags || []),
      deployment_status: entry.deploymentStatus || 'pending',
      created_at: now(),
      updated_at: now()
    }
  }];
}

export function buildSystemHealthSignalWrites(signal: SystemHealthSignal): DatabaseReadyWrite[] {
  const id = hashId('health', `${signal.service}:${now()}`);
  return [{
    table: 'system_health_signals',
    id,
    action: 'insert',
    record: {
      id,
      service: signal.service,
      status: signal.status,
      reason: signal.reason,
      severity: signal.severity,
      source: signal.source,
      recommendation: signal.recommendation || '',
      created_at: now(),
      updated_at: now()
    }
  }];
}

export function buildCatchCorrectWrites(event: CatchCorrectEvent): DatabaseReadyWrite[] {
  const id = hashId('catch_correct', `${event.module}:${now()}`);
  return [{
    table: 'catch_correct_events',
    id,
    action: 'insert',
    record: {
      id,
      module: event.module,
      error_summary: event.errorSummary,
      correction: event.correction,
      rule: event.rule,
      reusable: 1,
      created_at: now(),
      updated_at: now()
    }
  }, {
    table: 'audit_logs',
    id: hashId('audit', `catch_correct:${id}`),
    action: 'insert',
    record: {
      id: hashId('audit', `catch_correct:${id}`),
      actor: 'engineering_platform',
      action: 'catch_correct_recorded',
      target_table: 'catch_correct_events',
      target_id: id,
      risk_level: event.severity || 'medium',
      allowed: 1,
      reason: `Recorded catch-and-correct rule for ${event.module}: ${event.rule}`,
      created_at: now()
    }
  }];
}

export async function ingestCodexChangelog(entry: CodexChangelogEntry): Promise<{ ok: boolean; inserted: number; errors: string[]; id: string }> {
  const writes = buildCodexChangelogWrites(entry);
  const { inserted, errors } = await persistDatabaseReadyWrites(writes);
  return { ok: errors.length === 0, inserted, errors, id: writes[0].id };
}

export async function ingestSystemHealthSignal(signal: SystemHealthSignal): Promise<{ ok: boolean; inserted: number; errors: string[]; id: string }> {
  const writes = buildSystemHealthSignalWrites(signal);
  const { inserted, errors } = await persistDatabaseReadyWrites(writes);
  return { ok: errors.length === 0, inserted, errors, id: writes[0].id };
}

export async function ingestCatchCorrectEvent(event: CatchCorrectEvent): Promise<{ ok: boolean; inserted: number; errors: string[]; id: string }> {
  const writes = buildCatchCorrectWrites(event);
  const { inserted, errors } = await persistDatabaseReadyWrites(writes);
  return { ok: errors.length === 0, inserted, errors, id: writes[0].id };
}
