import { NextResponse } from 'next/server';
import { ALLOWED_TABLES, getDatabaseHealth, getDatabaseStats, getRecord, listRecords } from '@/lib/revenue-command-db';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const table = url.searchParams.get('table') || '';
  const id = url.searchParams.get('id') || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '50'), 1), 500);
  const database = getDatabaseHealth();

  if (!table) {
    const auth = authorizeRevenueCommandInternalRequest(request);
    const stats = getDatabaseStats();
    return NextResponse.json({
      ok: true,
      stats: auth.ok ? stats : { totalOwnedRecords: database.recordCount },
      database: auth.ok
        ? database
        : { driver: database.driver, durable: database.durable, schemaVersion: database.schemaVersion, warning: database.warning || null },
      authoritative: database.durable,
      access: auth.ok ? 'internal' : 'public_health_only'
    });
  }

  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  if (!ALLOWED_TABLES.has(table)) return NextResponse.json({ error: 'Unknown table' }, { status: 400 });

  if (id) {
    const record = getRecord(table, id);
    return record
      ? NextResponse.json({ ok: true, table, record, access: 'internal' })
      : NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, table, records: listRecords(table, limit), access: 'internal' });
}
