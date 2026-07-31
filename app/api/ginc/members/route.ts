import { NextResponse } from 'next/server.js';
import { GincMember } from '@/lib/ginc';
import { addMember, generateGincId, isRateLimited, loadNetwork, sanitizeMember } from '@/lib/ginc-store';

export const runtime = 'nodejs';

const allowedTypes = new Set(['owner', 'renter', 'worker', 'business']);

function clientKey(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    // Use the rightmost entry, which is the closest proxy's/client's actual IP.
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
  let members = network.members.map(sanitizeMember);
  const state = searchParams.get('state');
  const type = searchParams.get('type');
  if (state) members = members.filter((m) => m.state.toLowerCase() === state.toLowerCase());
  if (type && allowedTypes.has(type)) members = members.filter((m) => m.type === type);
  return NextResponse.json({ members });
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

  await addMember(member);

  return NextResponse.json({ message: 'Member profile created.', member }, { status: 201 });
}
