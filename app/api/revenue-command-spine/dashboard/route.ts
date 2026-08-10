import { NextResponse } from 'next/server';
import { buildRevenueCommandDashboard } from '@/lib/revenue-command-dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, dashboard: buildRevenueCommandDashboard() });
}
