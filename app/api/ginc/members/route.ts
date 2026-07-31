import { NextResponse } from 'next/server.js';
import { GincMember } from '@/lib/ginc';
import { generateGincId, loadNetwork, sanitizeMember, saveNetwork } from '@/lib/ginc-store';

export const runtime = 'nodejs';

const allowedTypes = new Set(['owner', 'renter', 'worker', 'business']);
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
  let members = network.members.map(sanitizeMember);
  const state = searchParams.get('state');
  const type = searchParams.get('type');
  if (state) members = members.filter((m) => m.state.toLowerCase() === state.toLowerCase());
  if (type && allowedTypes.has(type)) members = members.filter((m) => m.type === type);
  return NextResponse.json({ members });
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

  const type = clean(body.type, 40);
  if (!allowedTypes.has(type)) return NextResponse.json({ message: 'Invalid member type.' }, { status: 400 });
  const fullName = clean(body.fullName, 120);
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 40);
  const city = clean(body.city, 120);
  const state = clean(body.state, 40);
  const zip = clean(body.zip, 20);
  if (!fullName || !email || !phone || !city || !state) {
    return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'Invalid email address.' }, { status: 400 });
  }

  const member: GincMember = {
    id: generateGincId('MEM'),
    type: type as GincMember['type'],
    fullName,
    email,
    phone,
    city,
    state,
    zip,
    skills: clean(body.skills, 1500),
    bio: clean(body.bio, 3000),
    createdAt: new Date().toISOString()
  };

  const network = await loadNetwork();
  network.members.push(member);
  await saveNetwork(network);

  return NextResponse.json({ message: 'Member profile created.', member }, { status: 201 });
}
