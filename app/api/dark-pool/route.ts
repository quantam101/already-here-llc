import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
    const signal = searchParams.get('signal') || undefined;
    const week = searchParams.get('week') || undefined;

    const dbPath = path.join(process.cwd(), 'data', 'dark_pool.db');
    const db = new Database(dbPath, { readonly: true, fileMustExist: false });

    let query = 'SELECT * FROM scores WHERE 1=1';
    const params: (string | number)[] = [];

    if (week) {
      query += ' AND week_start = ?';
      params.push(week);
    }
    if (signal) {
      query += ' AND signal = ?';
      params.push(signal.toUpperCase());
    }

    query += ' ORDER BY score DESC, symbol LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;

    const summary = db
      .prepare(
        'SELECT week_start, COUNT(*) as count FROM scores GROUP BY week_start ORDER BY week_start DESC LIMIT 10'
      )
      .all() as Array<{ week_start: string; count: number }>;

    db.close();

    return NextResponse.json({
      data: rows,
      weeks: summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to read dark-pool scores', detail: String(error) },
      { status: 500 }
    );
  }
}
