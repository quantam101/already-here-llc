import { timingSafeEqual } from 'crypto';

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
export function isInternalAuthorized(request: Request): boolean {
  const token = extractInternalApiKey(request.headers)?.trim() ?? '';
  if (!token) return false;
  const keys = [process.env.AHFOS_INTERNAL_API_KEY, process.env.GINC_ADMIN_KEY]
    .map((k) => k?.trim())
    .filter((k): k is string => !!k);
  return keys.some((key) => {
    if (key.length !== token.length) return false;
    try {
      return timingSafeEqual(Buffer.from(key), Buffer.from(token));
    } catch {
      return false;
    }
  });
}
