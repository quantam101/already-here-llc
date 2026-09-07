import { NextRequest, NextResponse } from 'next/server';
import { buildSystemHealthSummary, querySystemHealthSignals, recordSystemHealthSignal } from '@/lib/system-health';
import { extractInternalApiKey, isInternalApiKeyValid } from '@/lib/internal-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [summary, signals] = await Promise.all([buildSystemHealthSummary(), querySystemHealthSignals(100)]);
  return NextResponse.json({ ok: true, summary, signals });
}

export async function POST(request: NextRequest) {
  if (!isInternalApiKeyValid(extractInternalApiKey(request.headers))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const id = await recordSystemHealthSignal(body);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
