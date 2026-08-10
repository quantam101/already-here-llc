import { createHmac, timingSafeEqual } from 'node:crypto';

export const REVENUE_COMMAND_SESSION_COOKIE = 'revenue_command_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type InternalAuthorization = {
  ok: boolean;
  reason?: 'token_not_configured' | 'missing_token' | 'invalid_token' | 'expired_session';
  via?: 'bearer' | 'cookie';
};

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function configuredToken(): string {
  return process.env.REVENUE_COMMAND_INTERNAL_TOKEN || '';
}

function signature(token: string, expiresAt: string): string {
  return createHmac('sha256', token).update(`revenue-command:${expiresAt}`).digest('hex');
}

export function createRevenueCommandSession(now = Date.now()): { value: string; maxAge: number; expiresAt: number } {
  const token = configuredToken();
  if (!token) throw new Error('REVENUE_COMMAND_INTERNAL_TOKEN is not configured');
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  const expires = String(expiresAt);
  return { value: `${expires}.${signature(token, expires)}`, maxAge: SESSION_TTL_SECONDS, expiresAt };
}

export function verifyRevenueCommandSession(value: string, now = Date.now()): InternalAuthorization {
  const token = configuredToken();
  if (!token) return { ok: false, reason: 'token_not_configured' };
  const [expiresAt, suppliedSignature] = value.split('.', 2);
  if (!expiresAt || !suppliedSignature || !/^\d+$/.test(expiresAt)) return { ok: false, reason: 'invalid_token' };
  if (Number(expiresAt) <= now) return { ok: false, reason: 'expired_session' };
  return safeEqual(signature(token, expiresAt), suppliedSignature)
    ? { ok: true, via: 'cookie' }
    : { ok: false, reason: 'invalid_token' };
}

function cookieValue(request: Request, name: string): string {
  const cookie = request.headers.get('cookie') || '';
  const pair = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : '';
}

export function validateRevenueCommandToken(candidate: string): boolean {
  const expected = configuredToken();
  return Boolean(expected && candidate && safeEqual(expected, candidate));
}

export function authorizeRevenueCommandInternalRequest(request: Request): InternalAuthorization {
  const expected = configuredToken();
  if (!expected) return { ok: false, reason: 'token_not_configured' };
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    || request.headers.get('x-revenue-command-token')
    || '';
  if (supplied) return safeEqual(expected, supplied) ? { ok: true, via: 'bearer' } : { ok: false, reason: 'invalid_token' };
  const session = cookieValue(request, REVENUE_COMMAND_SESSION_COOKIE);
  if (session) return verifyRevenueCommandSession(session);
  return { ok: false, reason: 'missing_token' };
}

export function internalAuthError(reason?: InternalAuthorization['reason']): { error: string; code: string } {
  if (reason === 'token_not_configured') {
    return { error: 'Revenue Command internal API is disabled until an internal token is configured.', code: 'INTERNAL_TOKEN_NOT_CONFIGURED' };
  }
  if (reason === 'expired_session') {
    return { error: 'Revenue Command session expired.', code: 'EXPIRED_INTERNAL_SESSION' };
  }
  return { error: 'Internal authorization required.', code: reason === 'invalid_token' ? 'INVALID_INTERNAL_TOKEN' : 'MISSING_INTERNAL_TOKEN' };
}
