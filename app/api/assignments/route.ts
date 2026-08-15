import { NextResponse } from 'next/server';
import { buildAssignmentRecords, type AssignmentInput } from '@/lib/field-operations';
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

function asNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inputFromBody(body: Record<string, unknown>): AssignmentInput | null {
  const workOrderId = asString(body.workOrderId);
  const technicianId = asString(body.technicianId);
  const assignedBy = asString(body.assignedBy);
  if (!workOrderId || !technicianId || !assignedBy) return null;

  return {
    workOrderId,
    technicianId,
    assignedBy,
    rateCents: asNumber(body.rateCents),
    notes: asString(body.notes) || undefined,
    scheduledStart: asString(body.scheduledStart) || undefined,
    scheduledEnd: asString(body.scheduledEnd) || undefined,
    sameDay: Boolean(body.sameDay),
    weekend: Boolean(body.weekend)
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = inputFromBody(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: 'Missing workOrderId, technicianId, or assignedBy.' }, { status: 400 });
  }

  const workOrder = await getCanonicalStore().getRecord('jobs', input.workOrderId);
  const technician = await getCanonicalStore().getRecord('technicians', input.technicianId);
  if (!workOrder || !technician) {
    return NextResponse.json({ ok: false, error: 'Work order or technician not found.' }, { status: 404 });
  }

  const writes = buildAssignmentRecords(input);
  const writeResult = await getCanonicalStore().executeWrites(writes);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: writeResult.failed }, { status: 500 });
  }

  const assignmentId = writes.find((w) => w.table === 'assignments')!.id;
  return NextResponse.json({ ok: true, assignmentId, workOrderId: input.workOrderId, technicianId: input.technicianId });
}

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const records = await getCanonicalStore().queryTable('assignments', 1000);
  return NextResponse.json({ ok: true, count: records.length, records });
}
