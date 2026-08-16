import { NextResponse } from 'next/server.js';
import { logAudit } from '@/lib/audit';
import { GincListing } from '@/lib/ginc';
import { gincListingSchema } from '@/lib/ginc-schemas';
import { addListing, addMember, buildGincMember, generateGincId, isRateLimited, loadNetwork } from '@/lib/ginc-store';

export const runtime = 'nodejs';

const allowedStatuses = new Set(['available', 'rented', 'sold', 'unavailable']);

function clientKey(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return 'unknown';
}

function clean(value: unknown, max = 3000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const network = await loadNetwork();
  let listings = network.listings;
  const state = searchParams.get('state');
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  if (state) listings = listings.filter((l) => l.state.toLowerCase() === state.toLowerCase());
  if (category) listings = listings.filter((l) => l.category.toLowerCase().includes(category.toLowerCase()));
  if (status && allowedStatuses.has(status)) listings = listings.filter((l) => l.status === status);
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  if (await isRateLimited(clientKey(request))) {
    return NextResponse.json({ message: 'Too many submissions. Try again shortly.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = gincListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 });
  }

  const memberId = clean(body.memberId, 40);
  const title = clean(body.title, 200);
  const category = clean(body.category, 120);
  const assetType = clean(body.assetType, 80);
  const city = clean(body.city, 120);
  const state = clean(body.state, 40);
  const price = clean(body.price, 80);
  const period = clean(body.period, 80);
  const description = clean(body.description, 3000);
  if (!title || !category || !assetType || !city || !state || !price) {
    return NextResponse.json({ message: 'Missing required listing fields.' }, { status: 400 });
  }

  const network = await loadNetwork();
  let member = network.members.find((m) => m.id === memberId);
  if (!member) {
    try {
      member = buildGincMember(body);
      await addMember(member);
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : 'Invalid member data.' }, { status: 400 });
    }
  }

  const listing: GincListing = {
    id: generateGincId('LST'),
    memberId: member.id,
    title,
    category,
    assetType,
    city,
    state,
    price,
    period,
    description,
    status: 'available',
    createdAt: new Date().toISOString()
  };

  await addListing(listing);
  await logAudit({
    action: 'listing.create',
    actor: listing.memberId,
    resource: `listing:${listing.id}`,
    ip: clientKey(request),
    userAgent: request.headers.get('user-agent') || undefined,
    metadata: { category: listing.category, assetType: listing.assetType, state: listing.state }
  });

  return NextResponse.json({ message: 'Listing created.', listing }, { status: 201 });
}
