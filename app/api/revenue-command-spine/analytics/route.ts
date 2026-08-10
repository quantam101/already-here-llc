import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildAcquisitionFunnel, recordAnalyticsEvent } from '@/lib/revenue-command-analytics';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

const EventSchema = z.object({
  source: z.string().trim().min(1).max(160),
  module: z.string().trim().max(120).optional(),
  action: z.string().trim().min(1).max(160),
  pagePath: z.string().trim().max(1000).optional(),
  targetTable: z.string().trim().max(120).optional(),
  targetId: z.string().trim().max(200).optional(),
  leadId: z.string().trim().max(200).optional(),
  opportunityId: z.string().trim().max(200).optional(),
  sessionId: z.string().trim().max(500).optional(),
  conversionValueCents: z.number().int().min(0).max(1_000_000_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime().optional()
});

function deny(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  return auth.ok ? null : NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
}

export async function GET(request: Request) {
  const denied = deny(request); if (denied) return denied;
  return NextResponse.json({ ok: true, funnel: buildAcquisitionFunnel() });
}

export async function POST(request: Request) {
  const denied = deny(request); if (denied) return denied;
  const body = await request.json().catch(() => null);
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid analytics event', issues: parsed.error.issues }, { status: 400 });
  const result = await recordAnalyticsEvent(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
