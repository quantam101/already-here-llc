import { NextResponse } from 'next/server';
import { buildCloseoutRecords, type CloseoutInput } from '@/lib/field-operations';
import { getCanonicalStore } from '@/lib/canonical-store';

export const runtime = 'nodejs';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  const text = asString(value);
  if (!text) return [];
  return text.split(/[,;\n]+/).map((v) => v.trim()).filter(Boolean);
}

function asNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inputFromBody(body: Record<string, unknown>): CloseoutInput | null {
  const workOrderId = asString(body.workOrderId);
  const assignmentId = asString(body.assignmentId);
  const technicianId = asString(body.technicianId);
  const completionNotes = asString(body.completionNotes);
  const revenueCents = asNumber(body.revenueCents);

  if (!workOrderId || !assignmentId || !technicianId || !completionNotes || revenueCents === undefined) {
    return null;
  }

  const photos = Array.isArray(body.photos)
    ? body.photos.filter((p): p is { filename: string; mimeType: string; sizeBytes: number } =>
        typeof p === 'object' && p !== null && 'filename' in p && 'mimeType' in p && 'sizeBytes' in p
      )
    : [];

  return {
    workOrderId,
    assignmentId,
    technicianId,
    actualStart: asString(body.actualStart) || undefined,
    actualEnd: asString(body.actualEnd) || undefined,
    completionNotes,
    partsUsed: asStringArray(body.partsUsed),
    materialsUsed: asStringArray(body.materialsUsed),
    testingResults: asString(body.testingResults) || undefined,
    customerSignatureReceived: Boolean(body.customerSignatureReceived),
    photos,
    qaStatus: ['pass', 'fail', 'needs_review'].includes(asString(body.qaStatus)) ? (asString(body.qaStatus) as CloseoutInput['qaStatus']) : 'needs_review',
    revenueCents,
    technicianPayoutCents: asNumber(body.technicianPayoutCents),
    mileageMiles: asNumber(body.mileageMiles),
    disposalCostCents: asNumber(body.disposalCostCents),
    recoveryRevenueCents: asNumber(body.recoveryRevenueCents)
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = inputFromBody(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: 'Missing required closeout fields.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  const workOrder = store.getRecord('jobs', input.workOrderId);
  const assignment = store.getRecord('assignments', input.assignmentId);
  if (!workOrder || !assignment) {
    return NextResponse.json({ ok: false, error: 'Work order or assignment not found.' }, { status: 404 });
  }

  const writes = buildCloseoutRecords(input);
  const writeResult = store.executeWrites(writes);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: writeResult.failed }, { status: 500 });
  }

  const closeoutId = writes.find((w) => w.table === 'closeouts')!.id;
  const revenueId = writes.find((w) => w.table === 'revenue_events')!.id;
  return NextResponse.json({ ok: true, closeoutId, revenueId, workOrderId: input.workOrderId });
}

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const workOrderId = url.searchParams.get('workOrderId');
  const records = workOrderId
    ? getCanonicalStore().queryTable('closeouts', 1000).filter((r) => r.work_order_id === workOrderId)
    : getCanonicalStore().queryTable('closeouts', 1000);
  return NextResponse.json({ ok: true, count: records.length, records });
}
