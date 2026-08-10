import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';
import { importRevenueOsRecords } from '@/lib/revenue-command-revenue-os';

const RecordSchema = z.object({
  id: z.string().regex(/^RP-\d{3}$/),
  source: z.string().min(1).max(500),
  lane: z.string().min(1).max(200),
  revenue_play_name: z.string().min(1).max(300),
  buyer_type: z.string().max(1000).optional(),
  example_target_company_or_market: z.string().max(1000).optional(),
  contact_path: z.string().max(1000).optional(),
  location: z.string().max(500).optional(),
  pain_solved: z.string().max(2000).optional(),
  estimated_ticket_value: z.string().max(300).optional(),
  cost_required: z.string().max(500).optional(),
  profit_potential: z.string().max(120).optional(),
  time_to_revenue: z.string().max(120).optional(),
  recurring_potential: z.string().max(120).optional(),
  stacking_fit: z.string().max(120).optional(),
  startup_requirements: z.string().max(3000).optional(),
  first_10_target_strategy: z.string().max(3000).optional(),
  risk_flags: z.string().max(3000).optional(),
  recommended_action: z.string().min(1).max(3000),
  status: z.string().min(1).max(120),
  next_follow_up_date: z.string().max(60).optional(),
  notes: z.string().max(3000).optional(),
  score_inputs: z.record(z.string(), z.number()).optional(),
  opportunity_score: z.number().min(0).max(100)
});

const RequestSchema = z.object({
  records: z.array(RecordSchema).min(1).max(500),
  expectedCount: z.number().int().min(1).max(500).optional(),
  importedAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid Revenue OS import payload', issues: parsed.error.issues }, { status: 400 });
  const result = await importRevenueOsRecords(parsed.data.records, { expectedCount: parsed.data.expectedCount, importedAt: parsed.data.importedAt });
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
