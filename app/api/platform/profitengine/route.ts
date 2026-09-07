import { NextRequest, NextResponse } from 'next/server';
import { ingestProfitEngineEvent } from '@/lib/profitengine-bridge';
import { extractInternalApiKey, isInternalApiKeyValid } from '@/lib/internal-auth';

export async function POST(request: NextRequest) {
  if (!isInternalApiKeyValid(extractInternalApiKey(request.headers))) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await ingestProfitEngineEvent(await request.json());
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
