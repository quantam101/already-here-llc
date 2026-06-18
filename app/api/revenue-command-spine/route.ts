import { NextResponse } from 'next/server';
import { applyReviewAction, getRevenueCommandSpineResponse, type ReviewAction } from '@/lib/revenue-command-spine';

function isReviewAction(value: unknown): value is ReviewAction {
  return ['review', 'pass', 'reply', 'assign', 'quote', 'schedule', 'prove'].includes(String(value));
}

export async function GET() {
  return NextResponse.json(getRevenueCommandSpineResponse());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const recordId = typeof body?.recordId === 'string' ? body.recordId : 'unknown-record';
  const action = isReviewAction(body?.action) ? body.action : 'review';

  return NextResponse.json(applyReviewAction(recordId, action));
}
