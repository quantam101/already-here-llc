import { timingSafeEqual } from 'crypto';
import { isAuthorizedBasic } from './route-policy';

export function isInternalApiKeyValid(provided: string | null): boolean {
  const expectedValue = process.env.AHFOS_INTERNAL_API_KEY?.trim();
  if (!expectedValue) {
    return process.env.NODE_ENV === 'development' && process.env.ALLOW_UNAUTHENTICATED_INTERNAL_API === 'true';
  }
  if (!provided) return false;
  const expected = Buffer.from(expectedValue);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function extractInternalApiKey(headers: Headers): string | null {
  return headers.get('x-api-key') || headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
}

/**
 * Internal-bearer check for private API routes (canonical business records:
 * customers, technicians, work orders, revenue). Accepts
 * AHFOS_INTERNAL_API_KEY or GINC_ADMIN_KEY; constant-time compare.
 */
function isCrossSiteBrowserRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return true;
    } catch {
      return true;
    }
  }

  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  return fetchSite === 'cross-site' || fetchSite === 'same-site';
}

export function isInternalAuthorized(request: Request): boolean {
  const token = extractInternalApiKey(request.headers)?.trim() ?? '';
  const keys = [process.env.AHFOS_INTERNAL_API_KEY, process.env.GINC_ADMIN_KEY]
    .map((k) => k?.trim())
    .filter((k): k is string => !!k);
  const bearerAuthorized = Boolean(token) && keys.some((key) => {
    if (key.length !== token.length) return false;
    try {
      return timingSafeEqual(Buffer.from(key), Buffer.from(token));
    } catch {
      return false;
    }
  });
  if (bearerAuthorized) return true;

  // Protected operator screens already authenticate with Basic auth. Accept
  // the same server-side credential on API routes so those pages do not need
  // a copyable internal API key in browser JavaScript.
  const opsPassword = process.env.OPS_PORTAL_PASSWORD ?? '';
  const opsUser = process.env.OPS_PORTAL_USER || 'ops';
  if (isCrossSiteBrowserRequest(request)) return false;
  return isAuthorizedBasic(request.headers.get('authorization'), opsUser, opsPassword);
}

export function unauthorizedInternalResponse() {
  return Response.json(
    { ok: false, error: 'Internal authorization required.' },
    { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Already Here Operations", charset="UTF-8"' } }
  );
}
