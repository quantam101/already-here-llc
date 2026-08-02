import { NextResponse } from 'next/server.js';
import { AhfosRole, User } from './schema';
import { getSessionUser, requireAuth } from './auth';

export async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function authenticated(
  request: Request,
  allowedRoles?: AhfosRole[],
): Promise<{ user: User; response: NextResponse | null }> {
  const auth = await requireAuth(request, allowedRoles);
  if (auth.response) {
    return { user: {} as User, response: auth.response };
  }
  return { user: auth.user, response: null };
}

export function ok<T>(body: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, ...body }, init);
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, message }, { status });
}

export { getSessionUser };
