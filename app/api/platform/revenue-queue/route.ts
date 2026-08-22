import { NextResponse } from 'next/server';
import { buildRevenueActionQueue } from '@/lib/revenue-action-queue';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, queue: await buildRevenueActionQueue() });
}
