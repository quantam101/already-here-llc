import { NextResponse } from 'next/server';
import { buildAhfosCloseoutRecords, type AhfosCloseoutInput } from '@/lib/ahfos';
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

function asPhoto(value: unknown): { filename: string; mimeType: string; sizeBytes: number; caption?: string } | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const filename = asString(v.filename);
  const mimeType = asString(v.mimeType);
  const sizeBytes = Number(v.sizeBytes);
  if (!filename || !mimeType || !Number.isFinite(sizeBytes)) return undefined;
  return { filename, mimeType, sizeBytes, caption: asString(v.caption) || undefined };
}

function asPhotoArray(value: unknown): Array<{ filename: string; mimeType: string; sizeBytes: number; caption?: string }> {
  if (!Array.isArray(value)) return [];
  return value.map(asPhoto).filter((p): p is { filename: string; mimeType: string; sizeBytes: number; caption?: string } => !!p);
}

function inputFromBody(body: Record<string, unknown>): AhfosCloseoutInput | null {
  const customerName = asString(body.customerName);
  const company = asString(body.company);
  const email = asString(body.email);
  const problemDescription = asString(body.problemDescription);
  const resolutionDescription = asString(body.resolutionDescription);

  const site = (typeof body.site === 'object' && body.site !== null ? body.site : {}) as Record<string, unknown>;
  const equipment = (typeof body.equipment === 'object' && body.equipment !== null ? body.equipment : {}) as Record<string, unknown>;

  if (!customerName || !company || !email || !problemDescription || !resolutionDescription) return null;
  if (!asString(site.address) || !asString(site.city) || !asString(site.state)) return null;
  if (!asString(equipment.name)) return null;

  const revenueCents = Number(body.revenueCents);
  if (!Number.isFinite(revenueCents)) return null;

  const paymentStatus = asString(body.paymentStatus);

  return {
    source: asString(body.source) || 'ahfos_closeout_api',
    sourceId: asString(body.sourceId) || undefined,
    customerName,
    company,
    email,
    phone: asString(body.phone) || undefined,
    site: {
      name: asString(site.name) || undefined,
      address: asString(site.address),
      city: asString(site.city),
      state: asString(site.state),
      zip: asString(site.zip) || undefined
    },
    equipment: {
      name: asString(equipment.name),
      category: asString(equipment.category) || undefined,
      make: asString(equipment.make) || undefined,
      model: asString(equipment.model) || undefined,
      serialNumber: asString(equipment.serialNumber) || undefined,
      assetTag: asString(equipment.assetTag) || undefined,
      location: asString(equipment.location) || undefined
    },
    problemDescription,
    resolutionDescription,
    technicianId: asString(body.technicianId) || undefined,
    qaStatus: ['pass', 'fail', 'needs_review'].includes(asString(body.qaStatus)) ? (asString(body.qaStatus) as AhfosCloseoutInput['qaStatus']) : 'needs_review',
    proofPhotos: asPhotoArray(body.proofPhotos),
    testResults: asString(body.testResults) || undefined,
    customerSignatureReceived: body.customerSignatureReceived === true || asString(body.customerSignatureReceived) === 'true',
    revenueCents,
    technicianPayoutCents: Number(body.technicianPayoutCents) || undefined,
    partsUsed: Array.isArray(body.partsUsed) ? body.partsUsed.map((v) => asString(v)).filter(Boolean) : [],
    materialsUsed: Array.isArray(body.materialsUsed) ? body.materialsUsed.map((v) => asString(v)).filter(Boolean) : [],
    submittedAt: asString(body.submittedAt) || undefined,
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
    return NextResponse.json({ ok: false, error: 'Missing required AHFOS closeout fields.' }, { status: 400 });
  }

  const writes = buildAhfosCloseoutRecords(input);
  const writeResult = await getCanonicalStore().executeWrites(writes);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: writeResult.failed }, { status: 500 });
  }

  const jobId = writes.find((w) => w.table === 'jobs')!.id;
  const closeoutId = writes.find((w) => w.table === 'closeouts')!.id;
  const revenueId = writes.find((w) => w.table === 'revenue_events')!.id;

  return NextResponse.json({
    ok: true,
    jobId,
    closeoutId,
    revenueId,
    canonicalRecordCount: writes.length,
    grossMarginCents: (writes.find((w) => w.table === 'revenue_events')!.record as { gross_margin_cents: number }).gross_margin_cents
  });
}
