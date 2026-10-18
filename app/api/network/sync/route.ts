import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { syncFromDailyCommand } from '@/lib/command-sync';
import { isRateLimited } from '@/lib/ginc-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
  if (!token) return false;
  const keys = [process.env.AHFOS_INTERNAL_API_KEY, process.env.GINC_ADMIN_KEY]
    .map((k) => k?.trim()).filter((k): k is string => !!k);
  return keys.some((key) => {
    if (key.length !== token.length) return false;
    try {
      return timingSafeEqual(Buffer.from(key), Buffer.from(token));
    } catch {
      return false;
    }
  });
}

function clientKey(request: Request): string {
  return request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',').pop()?.trim()
    || 'unknown';
}

/**
 * POST /api/network/sync — pull daily-command-os intake (leads, RFQs,
 * dispatch requests) into the canonical store so the connection graph
 * links them to people, organizations, and jobs.
 *
 *   ?since=<iso>   only export records created after this timestamp
 *
 * Requires the internal Bearer (AHFOS_INTERNAL_API_KEY or
 * GINC_ADMIN_KEY). Idempotent: canonical ids are stable across runs.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  if (await isRateLimited(`sync:${clientKey(request)}`, 10, 60)) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 });
  }

  const since = new URL(request.url).searchParams.get('since') ?? undefined;
  // `since` is forwarded to the upstream export — require a real
  // ISO-8601 timestamp before trusting it.
  if (since !== undefined && (since.length > 40 || Number.isNaN(Date.parse(since)))) {
    return NextResponse.json({ ok: false, error: 'since must be a valid ISO-8601 timestamp.' }, { status: 400 });
  }
  try {
    const summary = await syncFromDailyCommand(since);
    return NextResponse.json(summary, { status: summary.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Sync failed.' },
      { status: 502 },
    );
  }
}
