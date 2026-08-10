import { timingSafeEqual } from 'node:crypto';

export type InternalAuthorization = {
  ok: boolean;
  reason?: 'token_not_configured' | 'missing_token' | 'invalid_token';
};

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizeRevenueCommandInternalRequest(request: Request): InternalAuthorization {
  const expected = process.env.REVENUE_COMMAND_INTERNAL_TOKEN;
  if (!expected) return { ok: false, reason: 'token_not_configured' };
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    || request.headers.get('x-revenue-command-token')
    || '';
  if (!supplied) return { ok: false, reason: 'missing_token' };
  return safeEqual(expected, supplied) ? { ok: true } : { ok: false, reason: 'invalid_token' };
}

export function internalAuthError(reason?: InternalAuthorization['reason']): { error: string; code: string } {
  if (reason === 'token_not_configured') {
    return { error: 'Revenue Command internal API is disabled until an internal token is configured.', code: 'INTERNAL_TOKEN_NOT_CONFIGURED' };
  }
  return { error: 'Internal authorization required.', code: reason === 'invalid_token' ? 'INVALID_INTERNAL_TOKEN' : 'MISSING_INTERNAL_TOKEN' };
}
