import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reconcileLeadIdentity } from '@/lib/revenue-command-reconcile';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

const ReconcileSchema = z.object({ leadId: z.string().trim().min(1).max(200), actor: z.string().trim().min(1).max(200).optional() });

export async function POST(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  const parsed = ReconcileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid reconcile payload', issues: parsed.error.issues }, { status: 400 });
  const result = await reconcileLeadIdentity(parsed.data.leadId, parsed.data.actor);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
