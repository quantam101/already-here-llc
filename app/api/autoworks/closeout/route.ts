import { NextResponse } from 'next/server';
import { buildAutoworksCloseoutRecords, type AutoworksPart, type AutoworksCloseoutInput } from '@/lib/autoworks';
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

function asPhoto(value: unknown): { filename: string; mimeType: string; sizeBytes: number } | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const filename = asString(v.filename);
  const mimeType = asString(v.mimeType);
  const sizeBytes = asNumber(v.sizeBytes);
  if (!filename || !mimeType || sizeBytes === undefined) return undefined;
  return { filename, mimeType, sizeBytes };
}

function asPhotoArray(value: unknown): Array<{ filename: string; mimeType: string; sizeBytes: number }> {
  if (!Array.isArray(value)) return [];
  return value.map(asPhoto).filter((p): p is { filename: string; mimeType: string; sizeBytes: number } => !!p);
}

function asParts(value: unknown): AutoworksPart[] {
  if (!Array.isArray(value)) return [];
  const parts: AutoworksPart[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const v = item as Record<string, unknown>;
    const name = asString(v.name);
    const costCents = asNumber(v.costCents);
    if (!name || costCents === undefined) continue;
    parts.push({ name, quantity: asNumber(v.quantity) ?? 1, costCents });
  }
  return parts;
}

function inputFromBody(body: Record<string, unknown>): AutoworksCloseoutInput | null {
  const jobId = asString(body.jobId);
  const diagnosis = asString(body.diagnosis);
  const recommendedRepair = asString(body.recommendedRepair);
  const revenueCents = asNumber(body.revenueCents);

  if (!jobId || !diagnosis || !recommendedRepair || revenueCents === undefined) {
    return null;
  }

  const paymentStatus = asString(body.paymentStatus);

  return {
    jobId,
    technicianId: asString(body.technicianId) || undefined,
    diagnosis,
    recommendedRepair,
    customerAuthorization: body.customerAuthorization === true || asString(body.customerAuthorization) === 'true',
    parts: asParts(body.parts),
    laborCents: asNumber(body.laborCents) ?? 0,
    completionPhotos: asPhotoArray(body.completionPhotos),
    customerAcceptance: body.customerAcceptance === true || asString(body.customerAcceptance) === 'true',
    revenueCents,
    technicianPayoutCents: asNumber(body.technicianPayoutCents),
    paymentStatus: paymentStatus === 'collected' || paymentStatus === 'invoiced' ? paymentStatus : 'booked'
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = inputFromBody(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: 'Missing required autoworks closeout fields.' }, { status: 400 });
  }

  const job = await getCanonicalStore().getRecord('jobs', input.jobId);
  if (!job) {
    return NextResponse.json({ ok: false, error: 'Job not found.' }, { status: 404 });
  }

  const writes = buildAutoworksCloseoutRecords(input);
  const writeResult = await getCanonicalStore().executeWrites(writes);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: writeResult.failed }, { status: 500 });
  }

  const closeoutId = writes.find((w) => w.table === 'closeouts')!.id;
  const revenueId = writes.find((w) => w.table === 'revenue_events')!.id;

  return NextResponse.json({
    ok: true,
    closeoutId,
    revenueId,
    grossMarginCents: (writes.find((w) => w.table === 'revenue_events')!.record as { gross_margin_cents: number }).gross_margin_cents,
    canonicalRecordCount: writes.length
  });
}
