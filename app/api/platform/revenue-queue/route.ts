import { NextResponse } from 'next/server';
import { isInternalAuthorized, unauthorizedInternalResponse } from '@/lib/internal-auth';
import { buildRevenueActionQueue } from '@/lib/revenue-action-queue';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) return unauthorizedInternalResponse();
  return NextResponse.json({ ok: true, queue: await buildRevenueActionQueue() });
}
