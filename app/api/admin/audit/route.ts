import { NextResponse } from 'next/server.js';
import { timingSafeEqual } from 'crypto';
import { getRecentAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const ADMIN_KEY = process.env.GINC_ADMIN_KEY;

function isAuthorized(request: Request): boolean {
  if (!ADMIN_KEY) return false;
  // Header-only: never accept the admin key via query string — URLs leak into
  // access logs, proxies, browser history, and Referer headers.
  const header = request.headers.get('x-admin-key');
  if (!header) return false;
  const expected = Buffer.from(ADMIN_KEY);
  const actual = Buffer.from(header);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const events = await getRecentAudit(Math.min(limit, 1000));
  return NextResponse.json({ events });
}
