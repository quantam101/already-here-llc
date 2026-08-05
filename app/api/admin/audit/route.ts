import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server.js';
import { getRecentAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const ADMIN_KEY = process.env.GINC_ADMIN_KEY;

function isAuthorized(request: Request): boolean {
  if (!ADMIN_KEY) return false;
  const header = request.headers.get('x-admin-key') ?? '';
  if (header.length !== ADMIN_KEY.length) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(ADMIN_KEY);
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get('limit') || '100', 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 1000) : 100;
  const events = await getRecentAudit(limit);
  return NextResponse.json({ events });
}
