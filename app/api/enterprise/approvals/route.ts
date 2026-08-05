import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getEnterpriseStore } from '@/lib/enterprise-store';

const statusSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(['approved', 'blocked', 'ranked']),
});

const INTERNAL_API_KEY = process.env.AHFOS_INTERNAL_API_KEY;

function isValidKey(provided: string | null): boolean {
  if (!INTERNAL_API_KEY || !provided) return false;
  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!isValidKey(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = getEnterpriseStore();
  const pending = store.getQueueByPriority().filter((item) => item.status === 'new');
  return NextResponse.json({ ok: true, count: pending.length, pending });
}

export async function POST(request: Request) {
  if (!isValidKey(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parseResult = statusSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parseResult.error.issues }, { status: 400 });
  }

  const store = getEnterpriseStore();
  const updated = store.updateQueueItem(parseResult.data.itemId, { status: parseResult.data.status });
  if (!updated) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  store.appendEvent({
    eventId: `evt-approval-${Date.now()}`,
    agentId: 'owner_approval_gate',
    operation: 'approval_decision',
    summary: `Item ${updated.itemId} marked ${updated.status}`,
    payload: { itemId: updated.itemId, status: updated.status },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, item: updated });
}
