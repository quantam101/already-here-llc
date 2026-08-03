import { NextResponse } from 'next/server.js';
import { logAudit } from '@/lib/audit';
import { GincJob } from '@/lib/ginc';
import { gincJobSchema } from '@/lib/ginc-schemas';
import { addJob, addMember, buildGincMember, generateGincId, isRateLimited, loadNetwork } from '@/lib/ginc-store';

export const runtime = 'nodejs';

const allowedStatuses = new Set(['open', 'filled', 'closed']);

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

  const parsed = gincJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Invalid input.' }, { status: 400 });
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
  await logAudit({
    action: 'job.create',
    actor: job.memberId,
    resource: `job:${job.id}`,
    ip: clientKey(request),
    userAgent: request.headers.get('user-agent') || undefined,
    metadata: { category: job.category, assetType: job.assetType, state: job.state }
  });

  return NextResponse.json({ message: 'Job posted.', job }, { status: 201 });
}
