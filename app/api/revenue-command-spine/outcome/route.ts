import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordAiOutcome } from '@/lib/revenue-command-outcomes';

const OutcomeSchema = z.object({
  aiActionId: z.string().trim().min(1).max(200),
  opportunityId: z.string().trim().min(1).max(200).optional(),
  outcomeType: z.enum(['accepted', 'rejected', 'completed', 'failed', 'revenue']),
  summary: z.string().trim().min(1).max(5000),
  realizedRevenueCents: z.number().int().min(0).max(1_000_000_000).optional(),
  realizedCostCents: z.number().int().min(0).max(1_000_000_000).optional(),
  verificationStatus: z.enum(['unverified', 'verified']).default('unverified'),
  evidence: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
  actor: z.string().trim().min(1).max(200).optional(),
  occurredAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = OutcomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid AI outcome payload', issues: parsed.error.issues }, { status: 400 });
  }

  const result = await recordAiOutcome(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
