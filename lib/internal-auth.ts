import { timingSafeEqual } from 'crypto';

export function isInternalApiKeyValid(provided: string | null): boolean {
  const internalKey = process.env.AHFOS_INTERNAL_API_KEY;
  if (!internalKey) {
    // Fail closed by default. Local development can opt in explicitly with
    // ALLOW_UNAUTHENTICATED_INTERNAL_API=true; never enable this in production/preview.
    return process.env.NODE_ENV === 'development' && process.env.ALLOW_UNAUTHENTICATED_INTERNAL_API === 'true';
  }
  if (!provided) return false;
  const expected = Buffer.from(internalKey);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
