import { NextResponse } from 'next/server';
import { buildRevenueCommandDashboard } from '@/lib/revenue-command-dashboard';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  return NextResponse.json({ ok: true, dashboard: buildRevenueCommandDashboard() });
}
