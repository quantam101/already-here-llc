import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAutoWorksIntake, updateAutoWorksAuthorization } from '@/lib/revenue-command-autoworks';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

const IntakeSchema = z.object({
  mode: z.literal('intake'),
  opportunityId: z.string().min(1).max(200),
  contactId: z.string().max(200).optional(),
  vin: z.string().min(11).max(30),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().max(120).optional(),
  model: z.string().max(120).optional(),
  mileage: z.number().int().min(0).max(2_000_000).optional(),
  fuelType: z.string().max(80).optional(),
  vehicleClass: z.string().max(120).optional(),
  location: z.string().max(500).optional(),
  batteryVoltage: z.number().min(0).max(100).optional(),
  conditionUponArrival: z.string().min(1).max(5000),
  insidePhotoRefs: z.array(z.string().max(2000)).max(50).optional(),
  exteriorPhotoRefs: z.array(z.string().max(2000)).max(50).optional(),
  underHoodPhotoRefs: z.array(z.string().max(2000)).max(50).optional(),
  requestedRepair: z.string().min(1).max(5000),
  repairCategory: z.string().min(1).max(160),
  estimateCents: z.number().int().min(0).max(100_000_000).optional(),
  observedAt: z.string().datetime().optional()
});

const AuthorizationSchema = z.object({
  mode: z.literal('authorization'),
  repairOrderId: z.string().min(1).max(200),
  approved: z.boolean(),
  actorId: z.string().min(1).max(200),
  afterPhotoRefs: z.array(z.string().max(2000)).max(50).optional(),
  completed: z.boolean().default(false)
});

const Schema = z.discriminatedUnion('mode', [IntakeSchema, AuthorizationSchema]);

export async function POST(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid AutoWorks payload', issues: parsed.error.issues }, { status: 400 });
  const result = parsed.data.mode === 'intake'
    ? await createAutoWorksIntake(parsed.data)
    : await updateAutoWorksAuthorization(parsed.data.repairOrderId, parsed.data.approved, parsed.data.actorId, parsed.data.afterPhotoRefs || [], parsed.data.completed);
  return NextResponse.json(result, { status: result.ok ? 200 : result.blockedReason ? 409 : 404 });
}
