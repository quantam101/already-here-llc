import { NextResponse } from 'next/server';
import { ociHealthCheck } from '@/lib/oci-canonical-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await ociHealthCheck();
  if (!health) {
    return NextResponse.json({
      ok: false,
      status: 'not_configured',
      message: 'OCI canonical persistence is not configured. Set OCI_CANONICAL_URL and OCI_CANONICAL_API_KEY.',
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: health.ok === true,
    status: health.ok === true ? 'healthy' : 'degraded',
    serverHealth: health,
    timestamp: new Date().toISOString(),
  });
}
