import { NextResponse } from 'next/server';
import { ingestCatchCorrectEvent, ingestCodexChangelog, ingestSystemHealthSignal } from '@/lib/revenue-command-engineering';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

export const runtime = 'nodejs';

function denied(request: Request): NextResponse | null {
  const auth = authorizeRevenueCommandInternalRequest(request);
  return auth.ok ? null : NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
}

export async function POST(request: Request) {
  const unauthorized = denied(request);
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => ({}));
  const type = String(body?.type || '');

  try {
    switch (type) {
      case 'codex': {
        const result = await ingestCodexChangelog({
          commitHash: String(body?.commitHash || 'unknown'),
          author: String(body?.author || 'unknown'),
          message: String(body?.message || ''),
          branch: body?.branch ? String(body.branch) : undefined,
          tags: Array.isArray(body?.tags) ? body.tags.map(String) : undefined,
          deploymentStatus: body?.deploymentStatus || 'pending'
        });
        return NextResponse.json({ type, ...result });
      }
      case 'health': {
        const result = await ingestSystemHealthSignal({
          service: String(body?.service || 'unknown'),
          status: body?.status || 'unknown',
          reason: String(body?.reason || ''),
          severity: body?.severity || 'medium',
          source: String(body?.source || 'api'),
          recommendation: body?.recommendation ? String(body.recommendation) : undefined
        });
        return NextResponse.json({ type, ...result });
      }
      case 'catch_correct': {
        const result = await ingestCatchCorrectEvent({
          module: String(body?.module || 'unknown'),
          errorSummary: String(body?.errorSummary || ''),
          correction: String(body?.correction || ''),
          rule: String(body?.rule || ''),
          severity: body?.severity || 'medium'
        });
        return NextResponse.json({ type, ...result });
      }
      default:
        return NextResponse.json({ ok: false, message: 'Unknown engineering record type. Use codex, health, or catch_correct.' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Engineering ingestion failed.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const unauthorized = denied(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({
    ok: true,
    service: 'revenue-command-spine-engineering',
    types: ['codex', 'health', 'catch_correct'],
    description: 'Internal engineering evidence ingestion for the owned operational database.'
  });
}
