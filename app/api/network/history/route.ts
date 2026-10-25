import { NextResponse } from 'next/server';
import { getWorkHistory, getWorkHistoryLeaderboard } from '@/lib/work-history';
import { isInternalAuthorized } from '@/lib/internal-auth';
import { isRateLimited } from '@/lib/ginc-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientKey(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return 'unknown';
}

/**
 * GET /api/network/history — completed-work records (internal scope).
 *
 *   ?id=<entity>   closeout trail + aggregates for one entity — accepts a
 *                  graph node id (canonical:person:<id>) or a raw canonical
 *                  record id (technician, contact, org, vehicle, site, job)
 *   ?leaderboard=1 fleet-wide aggregates: per-technician + per-organization
 *
 * Completed work is private business data (revenue, customers, techs), so
 * this route requires an internal bearer — same keys as /api/network full
 * scope. Nothing is fabricated: aggregates count real closeout rows only.
 */
export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Internal key required.' }, { status: 401 });
  }
  if (await isRateLimited(clientKey(request), 60, 60)) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();

  if (searchParams.get('leaderboard')) {
    const board = await getWorkHistoryLeaderboard();
    return NextResponse.json({ ok: true, scope: 'full', ...board });
  }

  if (!id) {
    return NextResponse.json({ ok: false, error: "Provide ?id=<entity> or ?leaderboard=1." }, { status: 400 });
  }

  const history = await getWorkHistory(id);
  if (!history) {
    return NextResponse.json({ ok: false, error: `No completed work found for '${id}'.` }, { status: 404 });
  }
  return NextResponse.json({ ok: true, scope: 'full', ...history });
}
