import { NextResponse } from 'next/server';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';
import { probeConfiguredOciBackend } from '@/lib/revenue-command-backend-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  const result = await probeConfiguredOciBackend();
  if (!result.configured) return NextResponse.json({ ok: false, configured: false, state: 'unknown', error: 'OCI_BACKEND_BASE_URL is not configured.' }, { status: 503 });
  return NextResponse.json({ ok: result.result?.ok === true, configured: true, ...result }, { status: result.result?.ok ? 200 : 503 });
}
