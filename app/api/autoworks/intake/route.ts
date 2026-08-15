import { NextResponse } from 'next/server';
import { buildAutoworksIntakeRecords, matchTechniciansForAutoworksJob, type AutoworksIntakeInput } from '@/lib/autoworks';
import { getCanonicalStore } from '@/lib/canonical-store';
import { buildFollowUpRecord } from '@/lib/followups';

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

function inputFromBody(body: Record<string, unknown>): AutoworksIntakeInput | null {
  const customerName = asString(body.customerName);
  const company = asString(body.company);
  const email = asString(body.email);
  const locationCity = asString(body.locationCity);
  const locationState = asString(body.locationState);
  const complaint = asString(body.complaint);

  if (!customerName || !company || !email || !locationCity || !locationState || !complaint) {
    return null;
  }

  const vehicle = (typeof body.vehicle === 'object' && body.vehicle !== null ? body.vehicle : {}) as Record<string, unknown>;
  const condition = (typeof body.condition === 'object' && body.condition !== null ? body.condition : {}) as Record<string, unknown>;

  return {
    source: asString(body.source) || 'autoworks_intake_api',
    sourceId: asString(body.sourceId) || undefined,
    channel: asString(body.channel) || 'web',
    customerName,
    company,
    email,
    phone: asString(body.phone) || undefined,
    vehicle: {
      vin: asString(vehicle.vin) || undefined,
      year: asNumber(vehicle.year),
      make: asString(vehicle.make) || undefined,
      model: asString(vehicle.model) || undefined,
      mileage: asNumber(vehicle.mileage),
      licensePlate: asString(vehicle.licensePlate) || undefined,
      color: asString(vehicle.color) || undefined
    },
    locationAddress: asString(body.locationAddress) || undefined,
    locationCity,
    locationState,
    locationZip: asString(body.locationZip) || undefined,
    complaint,
    condition: {
      exteriorPhotos: asPhotoArray(condition.exteriorPhotos),
      interiorPhotos: asPhotoArray(condition.interiorPhotos),
      underHoodPhoto: asPhoto(condition.underHoodPhoto),
      dashboardPhoto: asPhoto(condition.dashboardPhoto),
      batteryCondition: asString(condition.batteryCondition) || undefined,
      warningLights: Array.isArray(condition.warningLights)
        ? condition.warningLights.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
        : [],
      existingDamage: asString(condition.existingDamage) || undefined
    },
    serviceType: asString(body.serviceType) || 'mechanic_intake',
    requestedDate: asString(body.requestedDate) || undefined,
    requestedWindow: asString(body.requestedWindow) || undefined,
    estimatedValueCents: asNumber(body.estimatedValueCents),
    submittedAt: asString(body.submittedAt) || undefined
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = inputFromBody(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: 'Missing required autoworks intake fields.' }, { status: 400 });
  }

  const writes = buildAutoworksIntakeRecords(input);
  const writeResult = await getCanonicalStore().executeWrites(writes);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: writeResult.failed }, { status: 500 });
  }

  const jobId = writes.find((w) => w.table === 'jobs')!.id;
  const organizationId = writes.find((w) => w.table === 'organizations')!.id;
  const contactId = writes.find((w) => w.table === 'contacts')!.id;

  const followUp = buildFollowUpRecord({
    source: input.source,
    sourceId: input.sourceId,
    organizationId,
    contactId,
    relatedRecordType: 'autoworks',
    relatedRecordId: jobId,
    lane: 'autoworks',
    purpose: `Follow up on ${input.vehicle.make ?? ''} ${input.vehicle.model ?? ''} mechanic intake for ${input.company}`,
    channel: input.channel as 'email' | 'phone' | 'sms' | 'web' | 'in_person' ?? 'email',
    offer: input.serviceType,
    status: 'open'
  });
  await getCanonicalStore().executeWrites([followUp]);

  const matches = await matchTechniciansForAutoworksJob(jobId);

  return NextResponse.json({
    ok: true,
    jobId,
    vehicleId: writes.find((w) => w.table === 'vehicles')!.id,
    canonicalRecordCount: writes.length,
    matchCandidates: matches.matches.length,
    matches: matches.matches
  });
}

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get('id');
  const store = getCanonicalStore();

  if (jobId) {
    const record = await store.getRecord('jobs', jobId);
    if (!record) return NextResponse.json({ ok: false, error: 'Job not found.' }, { status: 404 });
    const matches = await matchTechniciansForAutoworksJob(jobId);
    return NextResponse.json({ ok: true, record, matches });
  }

  const records = await store.queryTable('jobs', 1000);
  const autoworksRecords = records.filter((r) => (r as { lane?: string }).lane === 'autoworks');
  return NextResponse.json({ ok: true, count: autoworksRecords.length, records: autoworksRecords });
}
