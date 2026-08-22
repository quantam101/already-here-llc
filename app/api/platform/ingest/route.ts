import { NextRequest, NextResponse } from 'next/server';
import { resolveBusinessSignal } from '@/lib/business-event-resolver';
import { extractInternalApiKey, isInternalApiKeyValid } from '@/lib/internal-auth';

export async function POST(request: NextRequest) {
  if (!isInternalApiKeyValid(extractInternalApiKey(request.headers))) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const result = await resolveBusinessSignal(await request.json());
  return NextResponse.json({ ok: true, result }, { status: 201 });
}
