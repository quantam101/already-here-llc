import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordApprovalAction } from '@/lib/revenue-command-approval';

const ApprovalSchema = z.object({
  targetTable: z.string().trim().min(1).max(100),
  targetId: z.string().trim().min(1).max(200),
  action: z.enum(['review', 'approve', 'reject', 'pass', 'reply', 'assign', 'schedule', 'dispatch', 'archive', 'escalate']),
  actorId: z.string().trim().min(1).max(200),
  authorityScope: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().max(5000).optional(),
  requestId: z.string().trim().min(1).max(500).optional(),
  createdAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid approval payload', issues: parsed.error.issues }, { status: 400 });
  }
  const result = await recordApprovalAction(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
