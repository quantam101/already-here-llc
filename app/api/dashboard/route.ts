import { NextResponse } from 'next/server';
import { isInternalAuthorized, unauthorizedInternalResponse } from '@/lib/internal-auth';
import { getDashboardMetrics } from '@/lib/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return unauthorizedInternalResponse();
  const metrics = await getDashboardMetrics();
  return NextResponse.json({ ok: true, ...metrics });
}
