import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHaulingPhotoQuote } from '@/lib/revenue-command-hauling';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

const ItemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  count: z.number().int().min(1).max(1000),
  volumeCubicFeet: z.number().min(0).max(100000),
  resaleValueCents: z.number().int().min(0).max(100_000_000).optional(),
  disposalCostCents: z.number().int().min(0).max(100_000_000).optional(),
  confidence: z.number().min(0).max(1).optional()
});

const PolicySchema = z.object({
  baseFeeCents: z.number().int().min(0).max(10_000_000).optional(),
  perCubicYardCents: z.number().int().min(0).max(10_000_000).optional(),
  laborHourlyCents: z.number().int().min(0).max(10_000_000).optional(),
  perMileCents: z.number().int().min(0).max(1_000_000).optional(),
  minimumQuoteCents: z.number().int().min(0).max(100_000_000).optional(),
  resaleCreditShareBps: z.number().int().min(0).max(10_000).optional()
}).partial();

const Schema = z.object({
  opportunityId: z.string().trim().min(1).max(200),
  scanId: z.string().trim().min(1).max(200),
  pickupAddress: z.string().trim().min(1).max(1000),
  dropoffAddress: z.string().trim().max(1000).optional(),
  photoRefs: z.array(z.string().max(2000)).min(1).max(100),
  items: z.array(ItemSchema).min(1).max(500),
  estimatedMiles: z.number().min(0).max(5000),
  estimatedLaborMinutes: z.number().int().min(0).max(24 * 60),
  policy: PolicySchema.optional(),
  generatedAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid hauling photo quote payload', issues: parsed.error.issues }, { status: 400 });
  const result = await createHaulingPhotoQuote(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
