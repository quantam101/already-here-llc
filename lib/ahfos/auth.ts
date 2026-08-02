import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server.js';
import { AhfosRole, User } from './schema';
import { getUserById } from './store';

const SESSION_COOKIE = 'ahfos_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getSessionSecret(): string {
  const secret = process.env.AHFOS_SESSION_SECRET;
  if (!secret) {
    throw new Error('AHFOS_SESSION_SECRET is not configured.');
  }
  return secret;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password, salt, 64).toString('base64url');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'base64url');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

export function signJwt(payload: Record<string, unknown>): string {
  const secret = getSessionSecret();
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ ...payload, iat: now, exp: now + SESSION_MAX_AGE_SECONDS });
  const signingInput = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  const secret = getSessionSecret();
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const signingInput = `${header}.${body}`;
  const expected = createHmac('sha256', secret).update(signingInput).digest('base64url');
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, unknown>;
    const exp = Number(payload.exp);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(header: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name) result[name] = decodeURIComponent(rest.join('=') || '');
  }
  return result;
}

function serializeCookie(name: string, value: string, maxAge?: number): string {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export function setSessionCookie(response: NextResponse, user: User): void {
  const token = signJwt({ userId: user.id, roles: user.roles });
  response.headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS));
}

export function clearSessionCookie(response: NextResponse): void {
  response.headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, '', 0));
}

export async function getSessionUser(request: Request): Promise<User | null> {
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') return null;
  return getUserById(payload.userId);
}

export async function requireAuth(
  request: Request,
  allowedRoles?: AhfosRole[],
): Promise<{ user: User; response?: NextResponse }> {
  const user = await getSessionUser(request);
  if (!user) {
    return { user: {} as User, response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  if (allowedRoles && !user.roles.some((role) => allowedRoles.includes(role))) {
    return { user: {} as User, response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function getPageSessionUser(): Promise<User | null> {
  const { cookies: nextCookies } = await import('next/headers');
  const jar = await nextCookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') return null;
  return getUserById(payload.userId);
}

export function isRoleAllowed(user: User, roles: AhfosRole[]): boolean {
  return user.roles.some((role) => roles.includes(role));
}

export async function requirePageAuth(allowedRoles?: AhfosRole[], fallback = '/portal/login'): Promise<User> {
  const user = await getPageSessionUser();
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect(fallback);
    return null as never;
  }
  if (allowedRoles && !isRoleAllowed(user, allowedRoles)) {
    const { redirect } = await import('next/navigation');
    redirect('/portal');
    return null as never;
  }
  return user;
}
