import { NextRequest, NextResponse } from 'next/server';
import { getEngagementSummary, upsertEngagement } from '@/lib/engagements';
import { isInternalAuthorized, unauthorizedInternalResponse } from '@/lib/internal-auth';
import { isJsonRequest } from '@/lib/request-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isInternalAuthorized(request)) return unauthorizedInternalResponse();
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, summary: await getEngagementSummary(id) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 404 });
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalAuthorized(request)) return unauthorizedInternalResponse();
  if (!isJsonRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Expected JSON.' }, { status: 415 });
  }
  const engagement = await upsertEngagement(await request.json());
  return NextResponse.json({ ok: true, engagement }, { status: 201 });
}
