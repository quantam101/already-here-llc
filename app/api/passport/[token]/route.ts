import { NextResponse } from 'next/server';
import { getWorkPassport, verifyPassportToken } from '@/lib/work-passport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/passport/<token> — public, unauthenticated. The signed token is
 * the capability: it proves a specific closeout without exposing any
 * lookup surface. Response is sanitized by getWorkPassport (no PII).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const closeoutId = verifyPassportToken(decodeURIComponent(token));
  if (!closeoutId) {
    return NextResponse.json({ ok: false, error: 'Invalid passport.' }, { status: 404 });
  }
  const passport = await getWorkPassport(closeoutId);
  if (!passport) {
    return NextResponse.json({ ok: false, error: 'Passport not found.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, passport });
}
