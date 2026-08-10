import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ingestOpportunitySignal } from '@/lib/revenue-command-opportunity';

const Score = z.number().int().min(0).max(100).optional();
const OpportunitySignalSchema = z.object({
  sourceSystem: z.string().trim().min(1).max(160),
  sourceRecordId: z.string().trim().min(1).max(300),
  sourceType: z.string().trim().min(1).max(120),
  sourceUri: z.string().url().max(2000).optional(),
  title: z.string().trim().min(3).max(500),
  lane: z.string().trim().min(1).max(120),
  revenueLaneSupported: z.string().trim().min(1).max(120).optional(),
  estimatedValueCents: z.number().int().min(0).max(1_000_000_000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  blocker: z.string().trim().max(3000).optional(),
  nextAction: z.string().trim().min(1).max(3000),
  recommendedFollowUpDate: z.string().date().optional(),
  revenueImpactScore: Score,
  recurringRevenueScore: Score,
  dataNetworkScore: Score,
  dependencyScore: Score,
  riskReductionScore: Score,
  proofSpeedScore: Score,
  reusableProductScore: Score,
  evidence: z.record(z.string(), z.unknown()).optional(),
  discoveredAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = OpportunitySignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid opportunity signal', issues: parsed.error.issues }, { status: 400 });
  }

  const result = await ingestOpportunitySignal(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
