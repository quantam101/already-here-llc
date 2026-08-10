import { NextResponse } from 'next/server';
import { ALLOWED_TABLES, getDatabaseHealth, getDatabaseStats, getRecord, listRecords } from '@/lib/revenue-command-db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const table = url.searchParams.get('table') || '';
  const id = url.searchParams.get('id') || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '50'), 1), 500);

  if (!table) {
    const database = getDatabaseHealth();
    return NextResponse.json({
      ok: true,
      stats: getDatabaseStats(),
      database,
      authoritative: database.durable
    });
  }

  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  if (id) {
    const record = getRecord(table, id);
    return record
      ? NextResponse.json({ ok: true, table, record })
      : NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, table, records: listRecords(table, limit) });
}
