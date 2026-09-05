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
