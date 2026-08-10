import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildRouteStack, persistRouteStack } from '@/lib/revenue-command-routing';

const PointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

const TechnicianSchema = PointSchema.extend({
  id: z.string().trim().min(1).max(160),
  skills: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  availableMinutes: z.number().int().min(15).max(24 * 60)
});

const CandidateSchema = PointSchema.extend({
  id: z.string().trim().min(1).max(160),
  opportunityId: z.string().trim().min(1).max(160),
  lane: z.string().trim().min(1).max(80),
  address: z.string().trim().max(500).optional(),
  requiredSkills: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  estimatedRevenueCents: z.number().int().min(0).max(100_000_000),
  estimatedCostCents: z.number().int().min(0).max(100_000_000).optional(),
  estimatedMinutes: z.number().int().min(15).max(24 * 60),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  slaDueAt: z.string().datetime().optional()
});

const RequestSchema = z.object({
  technician: TechnicianSchema,
  candidates: z.array(CandidateSchema).min(1).max(250),
  generatedAt: z.string().datetime().optional(),
  persist: z.boolean().default(true)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid route-stack request', issues: parsed.error.issues }, { status: 400 });
  }

  const stack = buildRouteStack(
    parsed.data.technician,
    parsed.data.candidates,
    parsed.data.generatedAt || new Date().toISOString()
  );

  if (!parsed.data.persist) {
    return NextResponse.json({ ok: true, stack: { ...stack, persisted: false, persistenceErrors: [] } });
  }

  const persisted = await persistRouteStack(stack);
  return NextResponse.json({ ok: persisted.persisted, stack: persisted }, { status: persisted.persisted ? 200 : 500 });
}
