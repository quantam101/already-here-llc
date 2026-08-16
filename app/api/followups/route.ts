import { NextResponse } from 'next/server';
import { getCanonicalStore } from '@/lib/canonical-store';

export const runtime = 'nodejs';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 40;

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

const validStatuses = ['open', 'in_progress', 'waiting', 'closed', 'no_response', 'do_not_contact'];

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const followUpId = url.searchParams.get('id');
  const store = getCanonicalStore();

  if (followUpId) {
    const record = await store.getRecord('followups', followUpId);
    if (!record) return NextResponse.json({ ok: false, error: 'Follow-up not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, record });
  }

  const records = await store.queryTable('followups', 1000);
  const statusFilter = url.searchParams.get('status');
  const filtered = statusFilter ? records.filter((r) => (r as { status?: string }).status === statusFilter) : records;
  return NextResponse.json({ ok: true, count: filtered.length, records: filtered });
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const followUpId = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';

  if (!followUpId || !validStatuses.includes(status)) {
    return NextResponse.json({ ok: false, error: 'Missing follow-up id or invalid status.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  const existing = await store.getRecord('followups', followUpId);
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Follow-up not found.' }, { status: 404 });
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;
  const updated = {
    ...existing,
    status,
    notes: notes ?? (existing as { notes?: string | null }).notes ?? null,
    updated_at: new Date().toISOString()
  };

  const result = await store.executeWrites([{ table: 'followups', id: followUpId, action: 'insert', record: updated }]);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Failed to update follow-up.', failed: result.failed }, { status: 500 });
  }

  return NextResponse.json({ ok: true, followUpId, status });
}
