import { NextResponse } from 'next/server';
import { isInternalApiKeyValid } from '@/lib/internal-auth';
import { getCanonicalStore } from '@/lib/canonical-store';
import { buildAssetIntakeWithFollowUp, buildAssetIntakeRecords } from '@/lib/assets';
import type { AssetIntakeInput } from '@/lib/assets';

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

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }
  if (!isInternalApiKeyValid(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const store = getCanonicalStore();
  const assetId = url.searchParams.get('id');

  if (assetId) {
    const record = await store.getRecord('assets', assetId);
    if (!record) return NextResponse.json({ ok: false, error: 'Asset not found.' }, { status: 404 });
    const maintenance = await store.queryTable('maintenance', 1000);
    const history = maintenance.filter((m) => (m as { asset_id?: string }).asset_id === assetId);
    return NextResponse.json({ ok: true, record, maintenance: history });
  }

  const records = await store.queryTable('assets', 1000);
  return NextResponse.json({ ok: true, count: records.length, records });
}

function validateInput(body: Record<string, unknown>): AssetIntakeInput | null {
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const assetName = typeof body.assetName === 'string' ? body.assetName.trim() : '';
  if (!customerName || !company || !email || !assetName) return null;

  return {
    source: typeof body.source === 'string' ? body.source : 'asset-intake-web',
    sourceId: typeof body.sourceId === 'string' ? body.sourceId : undefined,
    customerName,
    company,
    email,
    phone: typeof body.phone === 'string' ? body.phone : undefined,
    assetName,
    category: typeof body.category === 'string' ? body.category : undefined,
    make: typeof body.make === 'string' ? body.make : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
    serialNumber: typeof body.serialNumber === 'string' ? body.serialNumber : undefined,
    assetTag: typeof body.assetTag === 'string' ? body.assetTag : undefined,
    location: typeof body.location === 'string' ? body.location : undefined,
    siteName: typeof body.siteName === 'string' ? body.siteName : undefined,
    siteAddress: typeof body.siteAddress === 'string' ? body.siteAddress : undefined,
    siteCity: typeof body.siteCity === 'string' ? body.siteCity : undefined,
    siteState: typeof body.siteState === 'string' ? body.siteState : undefined,
    siteZip: typeof body.siteZip === 'string' ? body.siteZip : undefined,
    purchaseDate: typeof body.purchaseDate === 'string' ? body.purchaseDate : undefined,
    warrantyExpiryDate: typeof body.warrantyExpiryDate === 'string' ? body.warrantyExpiryDate : undefined,
    notes: typeof body.notes === 'string' ? body.notes : undefined,
    submittedAt: typeof body.submittedAt === 'string' ? body.submittedAt : undefined
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }
  if (!isInternalApiKeyValid(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = validateInput(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: 'Missing required asset intake fields.' }, { status: 400 });
  }

  const createFollowUp = body.createFollowUp !== false;
  const writes = createFollowUp ? buildAssetIntakeWithFollowUp(input) : buildAssetIntakeRecords(input);
  const assetId = writes.find((w) => w.table === 'assets')!.id;
  const orgId = writes.find((w) => w.table === 'organizations')!.id;
  const contactId = writes.find((w) => w.table === 'contacts')!.id;

  const result = await getCanonicalStore().executeWrites(writes);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: result.failed }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assetId, orgId, contactId, canonicalRecordCount: writes.length });
}
