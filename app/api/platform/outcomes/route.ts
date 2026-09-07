import { NextRequest, NextResponse } from 'next/server';
import { recordAutoWorksOutcome, recordDispatchCloseout, recordHaulingOutcome } from '@/lib/domain-outcomes';
import { extractInternalApiKey, isInternalApiKeyValid } from '@/lib/internal-auth';

export async function POST(request: NextRequest) {
  if (!isInternalApiKeyValid(extractInternalApiKey(request.headers))) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const kind = String(body.kind ?? '');
  if (kind === 'dispatch') return NextResponse.json({ ok: true, proofId: await recordDispatchCloseout(body.payload) }, { status: 201 });
  if (kind === 'autoworks') return NextResponse.json({ ok: true, result: await recordAutoWorksOutcome(body.payload) }, { status: 201 });
  if (kind === 'hauling') return NextResponse.json({ ok: true, result: await recordHaulingOutcome(body.payload) }, { status: 201 });
  return NextResponse.json({ ok: false, error: 'kind must be dispatch, autoworks, or hauling' }, { status: 400 });
}
