import { NextResponse } from 'next/server.js';
import { GincListing } from '@/lib/ginc';
import { buildGincMember, generateGincId, loadNetwork, saveNetwork } from '@/lib/ginc-store';

export const runtime = 'nodejs';

const allowedStatuses = new Set(['available', 'rented', 'sold', 'unavailable']);
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function limited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 5;
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
  if (limited(clientKey(request))) {
    return NextResponse.json({ message: 'Too many submissions. Try again shortly.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
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
      network.members.push(member);
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

  network.listings.push(listing);
  await saveNetwork(network);

  return NextResponse.json({ message: 'Listing created.', listing }, { status: 201 });
}
