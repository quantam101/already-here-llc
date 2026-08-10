import { NextResponse } from 'next/server';
import { getDatabaseHealth, listRecords } from '@/lib/revenue-command-db';

function pick(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  return Object.fromEntries(fields.filter((field) => field in record).map((field) => [field, record[field]]));
}

export async function GET() {
  const database = getDatabaseHealth();
  const health = listRecords('system_health_signals', 50);
  const catchCorrect = listRecords('catch_correct_events', 20);
  const codex = listRecords('codex_changelog', 20);
  const verification = listRecords('verification_history', 20);
  const security = listRecords('security_findings', 50);

  const healthCounts = health.reduce<Record<string, number>>((acc, item) => {
    const state = String(item.status || item.state || 'unknown');
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
  const securityCounts = security.reduce<Record<string, number>>((acc, item) => {
    const severity = String(item.severity || 'unknown');
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    database: {
      driver: database.driver,
      durable: database.durable,
      schemaVersion: database.schemaVersion,
      recordCount: database.recordCount,
      warning: database.warning || null
    },
    counts: {
      health: healthCounts,
      security: securityCounts,
      catchCorrect: catchCorrect.length,
      codex: codex.length,
      verification: verification.length
    },
    recent: {
      health: health.slice(0, 6).map((item) => pick(item, ['id', 'service', 'platform', 'status', 'state', 'severity', 'reason', 'recommendation', 'updated_at', 'created_at'])),
      catchCorrect: catchCorrect.slice(0, 6).map((item) => pick(item, ['id', 'module', 'error_summary', 'correction', 'rule', 'severity', 'updated_at', 'created_at'])),
      codex: codex.slice(0, 6).map((item) => pick(item, ['id', 'commit_hash', 'repo', 'branch', 'message', 'deployment_status', 'status', 'created_at'])),
      verification: verification.slice(0, 6).map((item) => pick(item, ['id', 'target_type', 'target_id', 'verification_type', 'state', 'verified_at']))
    }
  });
}
