import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { recordSystemHealthSignal, querySystemHealthSignals } from '@/lib/system-health';

const INTERNAL_API_KEY = process.env.AHFOS_INTERNAL_API_KEY;
const OCI_HEALTH_URL = process.env.OCI_HEALTH_URL;

function isValidKey(provided: string | null): boolean {
  if (!INTERNAL_API_KEY) return true;
  if (!provided) return false;
  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

const signalSchema = z.object({
  source: z.string().min(1).max(200),
  component: z.string().min(1).max(100),
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'not_configured']),
  message: z.string().max(2000).optional(),
  probeUrl: z.string().max(500).optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
});

async function probeOCI(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured'; message: string; probeUrl: string }> {
  if (!OCI_HEALTH_URL) {
    return { status: 'not_configured', message: 'OCI_HEALTH_URL is not configured; status is evidence-backed as not_configured.', probeUrl: '' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(OCI_HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return { status: 'healthy', message: `OCI probe returned ${res.status}`, probeUrl: OCI_HEALTH_URL };
    }
    return { status: 'unhealthy', message: `OCI probe returned ${res.status}`, probeUrl: OCI_HEALTH_URL };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Probe failed';
    return { status: 'unhealthy', message, probeUrl: OCI_HEALTH_URL };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 1000);

  const oci = await probeOCI();
  recordSystemHealthSignal({ source: 'oci', component: 'oci_vm', ...oci });

  const signals = querySystemHealthSignals(limit);
  return NextResponse.json({ ok: true, oci, signals });
}

export async function POST(request: Request) {
  const provided = request.headers.get('x-internal-api-key');
  if (!isValidKey(provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parseResult = signalSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parseResult.error.issues }, { status: 400 });
  }

  const id = recordSystemHealthSignal(parseResult.data);
  return NextResponse.json({ ok: true, id });
}
