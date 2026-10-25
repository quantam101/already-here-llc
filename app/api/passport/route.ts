import { NextResponse } from 'next/server';
import { mintPassportToken } from '@/lib/work-passport';
import { getCanonicalStore } from '@/lib/canonical-store';
import { isInternalAuthorized } from '@/lib/internal-auth';
import { isRateLimited } from '@/lib/ginc-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/passport — mint a shareable passport link for a closeout.
 * Internal-only: anyone holding the link can view the proof card.
 * Body: { closeout_id } → { ok, token, url }
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Internal key required.' }, { status: 401 });
  }
  if (await isRateLimited(request.headers.get('x-real-ip') ?? 'unknown', 30, 60)) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 });
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const closeoutId = typeof body.closeout_id === 'string' ? body.closeout_id.trim() : '';
  if (!closeoutId) {
    return NextResponse.json({ ok: false, error: 'closeout_id required.' }, { status: 400 });
  }
  const existing = await getCanonicalStore().getRecord('closeouts', closeoutId).catch(() => null);
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Closeout not found.' }, { status: 404 });
  }
  const token = mintPassportToken(closeoutId);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'No passport signing key configured (WORK_PASSPORT_SECRET / GINC_ADMIN_KEY).' }, { status: 503 });
  }
  return NextResponse.json({ ok: true, token, url: `/passport/${token}` });
}
