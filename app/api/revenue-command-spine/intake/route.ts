import { NextResponse } from 'next/server';
import { buildRevenueCommandProofDemos, buildRevenueIntakeProof, type RevenueIntakeInput } from '@/lib/revenue-command-intake';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inputFromBody(body: Record<string, unknown>): RevenueIntakeInput {
  return {
    source: asString(body.source) || 'api_revenue_command_intake',
    fullName: asString(body.fullName) || 'Unknown Contact',
    company: asString(body.company) || 'Unknown Organization',
    email: asString(body.email),
    phone: asString(body.phone),
    title: asString(body.title) || asString(body.serviceType) || 'Revenue intake',
    body: asString(body.body) || asString(body.message) || 'No message provided.',
    location: asString(body.location) || asString(body.siteCity),
    serviceType: asString(body.serviceType),
    ticketNumber: asString(body.ticketNumber),
    requestedWindow: asString(body.requestedWindow),
    estimatedValueCents: asNumber(body.estimatedValueCents),
    submittedAt: asString(body.submittedAt) || undefined
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('demo') === 'all') {
    return NextResponse.json({ ok: true, demos: buildRevenueCommandProofDemos() });
  }

  const input = inputFromBody({
    source: url.searchParams.get('source') || 'api_revenue_command_intake_get',
    fullName: url.searchParams.get('fullName') || 'Smoke Test',
    company: url.searchParams.get('company') || 'Already Here LLC',
    email: url.searchParams.get('email') || 'smoke@example.invalid',
    title: url.searchParams.get('title') || 'Urgent same-day dispatch revenue opportunity by noon $500',
    body: url.searchParams.get('body') || 'Network smart hands dispatch proof request.',
    location: url.searchParams.get('location') || 'Phoenix, AZ',
    serviceType: url.searchParams.get('serviceType') || 'Technical field operations',
    estimatedValueCents: url.searchParams.get('estimatedValueCents') || 50000
  });

  return NextResponse.json(buildRevenueIntakeProof(input));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(buildRevenueIntakeProof(inputFromBody(body)));
}
