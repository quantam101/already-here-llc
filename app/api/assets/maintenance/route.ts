import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getCanonicalStore } from '@/lib/canonical-store';
import { buildMaintenanceRecord, type MaintenanceInput, type AssetRecord } from '@/lib/assets';

export const runtime = 'nodejs';

const INTERNAL_API_KEY = process.env.AHFOS_INTERNAL_API_KEY;

function isValidKey(provided: string | null): boolean {
  if (!INTERNAL_API_KEY) return true;
  if (!provided) return false;
  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

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

const validTypes = ['inspection', 'calibration', 'certification', 'repair', 'maintenance', 'cleaning', 'other'];
const validResults = ['pass', 'fail', 'needs_review', 'scheduled'];

function validateInput(body: Record<string, unknown>): MaintenanceInput | null {
  const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : '';
  const maintenanceType = typeof body.maintenanceType === 'string' ? body.maintenanceType.trim() : '';
  const result = typeof body.result === 'string' ? body.result.trim() : '';
  if (!assetId || !validTypes.includes(maintenanceType) || !validResults.includes(result)) return null;

  return {
    assetId,
    source: typeof body.source === 'string' ? body.source : 'maintenance-web',
    sourceId: typeof body.sourceId === 'string' ? body.sourceId : undefined,
    maintenanceType: maintenanceType as MaintenanceInput['maintenanceType'],
    performedBy: typeof body.performedBy === 'string' ? body.performedBy : undefined,
    performedAt: typeof body.performedAt === 'string' ? body.performedAt : undefined,
    dueDate: typeof body.dueDate === 'string' ? body.dueDate : undefined,
    result: result as MaintenanceInput['result'],
    notes: typeof body.notes === 'string' ? body.notes : undefined,
    costCents: typeof body.costCents === 'number' ? body.costCents : undefined,
    technicianId: typeof body.technicianId === 'string' ? body.technicianId : undefined,
    submittedAt: typeof body.submittedAt === 'string' ? body.submittedAt : undefined
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }
  if (!isValidKey(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = validateInput(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: 'Missing or invalid maintenance fields.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  const asset = await store.getRecord('assets', input.assetId);
  if (!asset) {
    return NextResponse.json({ ok: false, error: 'Asset not found.' }, { status: 404 });
  }

  const write = buildMaintenanceRecord(input, asset as unknown as AssetRecord);
  const result = await store.executeWrites([write]);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: result.failed }, { status: 500 });
  }

  return NextResponse.json({ ok: true, maintenanceId: write.id, assetId: input.assetId });
}
