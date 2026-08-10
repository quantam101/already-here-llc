import { NextResponse } from 'next/server';
import { z } from 'zod';
import { approveProcurementPreparation, createProcurementTarget } from '@/lib/revenue-command-procurement';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

const CreateSchema = z.object({
  mode: z.literal('create'),
  opportunityId: z.string().min(1).max(200),
  organizationId: z.string().max(200).optional(),
  solicitationId: z.string().min(1).max(300),
  targetType: z.enum(['RFI', 'RFQ', 'RFP', 'bid', 'vendor_registration', 'grant', 'commercial']),
  portalUrl: z.string().url().max(2000).optional(),
  agencyOrBuyer: z.string().min(1).max(300),
  deadlineDate: z.string().date().optional(),
  estimatedValueCents: z.number().int().min(0).max(10_000_000_000).optional(),
  requiredCertifications: z.array(z.string().max(200)).max(100).optional(),
  heldCertifications: z.array(z.string().max(200)).max(100).optional(),
  requiredCapabilities: z.array(z.string().max(200)).max(200).optional(),
  availableCapabilities: z.array(z.string().max(200)).max(200).optional(),
  source: z.string().max(160).optional(),
  observedAt: z.string().datetime().optional()
});

const ApproveSchema = z.object({
  mode: z.literal('approve_preparation'),
  targetId: z.string().min(1).max(200),
  actorId: z.string().min(1).max(200),
  note: z.string().max(5000).optional()
});

const Schema = z.discriminatedUnion('mode', [CreateSchema, ApproveSchema]);

export async function POST(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid procurement payload', issues: parsed.error.issues }, { status: 400 });
  const result = parsed.data.mode === 'create'
    ? await createProcurementTarget(parsed.data)
    : await approveProcurementPreparation(parsed.data.targetId, parsed.data.actorId, parsed.data.note);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
