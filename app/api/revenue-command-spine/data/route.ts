import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ALLOWED_TABLES, getDatabaseHealth, getDatabaseStats, getRecord, listRecords } from '@/lib/revenue-command-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_READ_TABLES = new Set(['opportunities']);
const PUBLIC_OPPORTUNITY_FIELDS = [
  'id', 'lane', 'revenue_lane_supported', 'title', 'estimated_value_cents', 'priority', 'score',
  'blocker', 'next_action', 'status', 'recommended_follow_up_date', 'created_at', 'updated_at'
];

function internalAuthorized(request: Request): boolean {
  const expected = process.env.REVENUE_COMMAND_INTERNAL_TOKEN;
  if (!expected) return false;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.headers.get('x-revenue-command-token') || '';
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function sanitizeOpportunity(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(PUBLIC_OPPORTUNITY_FIELDS.filter((field) => field in record).map((field) => [field, record[field]]));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const table = url.searchParams.get('table') || '';
  const id = url.searchParams.get('id') || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '50'), 1), 500);
  const internal = internalAuthorized(request);

  if (!table) {
    const database = getDatabaseHealth();
    const stats = getDatabaseStats();
    return NextResponse.json({
      ok: true,
      stats: internal ? stats : { opportunities: stats.opportunities || 0 },
      database: internal
        ? database
        : { driver: database.driver, durable: database.durable, schemaVersion: database.schemaVersion, warning: database.warning || null },
      authoritative: database.durable,
      access: internal ? 'internal' : 'public_sanitized'
    });
  }

  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }
  if (!internal && !PUBLIC_READ_TABLES.has(table)) {
    return NextResponse.json({ ok: false, error: 'Internal authorization required' }, { status: 401 });
  }

  if (id) {
    const record = getRecord(table, id);
    if (!record) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, table, record: internal ? record : sanitizeOpportunity(record), access: internal ? 'internal' : 'public_sanitized' });
  }

  const records = listRecords(table, limit);
  return NextResponse.json({
    ok: true,
    table,
    records: internal ? records : records.map(sanitizeOpportunity),
    access: internal ? 'internal' : 'public_sanitized'
  });
}
