import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const metrics = getDashboardMetrics();
  return NextResponse.json({ ok: true, ...metrics });
}
