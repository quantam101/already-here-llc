import { NextResponse } from 'next/server.js';
import { getRecentAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const ADMIN_KEY = process.env.GINC_ADMIN_KEY;

function isAuthorized(request: Request): boolean {
  if (!ADMIN_KEY) return false;
  const header = request.headers.get('x-admin-key');
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('key');
  return (header === ADMIN_KEY || query === ADMIN_KEY);
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
