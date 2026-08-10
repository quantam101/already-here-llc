import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';
import { ingestAhfosJobSnapshot } from '@/lib/revenue-command-ahfos';

const SnapshotSchema = z.object({
  jobId: z.string().min(1).max(200),
  opportunityId: z.string().max(200).optional(),
  customerId: z.string().max(200).optional(),
  technicianId: z.string().max(200).optional(),
  status: z.string().min(1).max(80),
  serviceType: z.string().max(200).optional(),
  siteAddress: z.string().max(500).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  closeoutNotes: z.string().max(5000).optional(),
  beforePhotos: z.array(z.string().max(2000)).max(100).optional(),
  afterPhotos: z.array(z.string().max(2000)).max(100).optional(),
  signatureRef: z.string().max(2000).optional(),
  checklistComplete: z.boolean().optional(),
  qaScore: z.number().min(0).max(100).optional(),
  qaMissingItems: z.array(z.string().max(500)).max(100).optional(),
  invoiceAmountCents: z.number().int().min(0).max(100_000_000).optional(),
  source: z.string().max(200).optional(),
  observedAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  const parsed = SnapshotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid AHFOS snapshot', issues: parsed.error.issues }, { status: 400 });
  const result = await ingestAhfosJobSnapshot(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
