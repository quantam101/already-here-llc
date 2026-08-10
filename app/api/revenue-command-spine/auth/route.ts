import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  REVENUE_COMMAND_SESSION_COOKIE,
  authorizeRevenueCommandInternalRequest,
  createRevenueCommandSession,
  internalAuthError,
  validateRevenueCommandToken
} from '@/lib/revenue-command-api-auth';

export const runtime = 'nodejs';

const LoginSchema = z.object({ token: z.string().min(16).max(1000) });

export async function GET(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  return NextResponse.json({ ok: auth.ok, authenticated: auth.ok, via: auth.via || null, ...(auth.ok ? {} : internalAuthError(auth.reason)) }, { status: auth.ok ? 200 : 401 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success || !validateRevenueCommandToken(parsed.data.token)) {
    return NextResponse.json({ ok: false, error: 'Invalid internal token.' }, { status: 401 });
  }
  const session = createRevenueCommandSession();
  const response = NextResponse.json({ ok: true, authenticated: true, expiresAt: new Date(session.expiresAt).toISOString() });
  response.cookies.set(REVENUE_COMMAND_SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: session.maxAge
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, authenticated: false });
  response.cookies.set(REVENUE_COMMAND_SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
