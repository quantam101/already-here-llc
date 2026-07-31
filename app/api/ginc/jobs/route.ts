import { NextResponse } from 'next/server.js';
import { GincJob } from '@/lib/ginc';
import { addJob, addMember, buildGincMember, generateGincId, isRateLimited, loadNetwork } from '@/lib/ginc-store';

export const runtime = 'nodejs';

const allowedStatuses = new Set(['open', 'filled', 'closed']);

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function clean(value: unknown, max = 3000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const network = await loadNetwork();
  let jobs = network.jobs;
  const state = searchParams.get('state');
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  if (state) jobs = jobs.filter((j) => j.state.toLowerCase() === state.toLowerCase());
  if (category) jobs = jobs.filter((j) => j.category.toLowerCase().includes(category.toLowerCase()));
  if (status && allowedStatuses.has(status)) jobs = jobs.filter((j) => j.status === status);
  return NextResponse.json({ jobs });
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

  const memberId = clean(body.memberId, 40);
  const title = clean(body.title, 200);
  const category = clean(body.category, 120);
  const assetType = clean(body.assetType, 80);
  const city = clean(body.city, 120);
  const state = clean(body.state, 40);
  const schedule = clean(body.schedule, 300);
  const budget = clean(body.budget, 80);
  const description = clean(body.description, 3000);
  if (!title || !category || !city || !state || !schedule) {
    return NextResponse.json({ message: 'Missing required job fields.' }, { status: 400 });
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

  const job: GincJob = {
    id: generateGincId('JOB'),
    memberId: member.id,
    title,
    category,
    assetType,
    city,
    state,
    schedule,
    budget,
    description,
    status: 'open',
    createdAt: new Date().toISOString()
  };

  await addJob(job);

  return NextResponse.json({ message: 'Job posted.', job }, { status: 201 });
}
