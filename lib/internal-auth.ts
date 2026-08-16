import { timingSafeEqual } from 'crypto';

const INTERNAL_API_KEY = process.env.AHFOS_INTERNAL_API_KEY;

export function isInternalApiKeyValid(provided: string | null): boolean {
  if (!INTERNAL_API_KEY) {
    return process.env.NODE_ENV === 'development';
  }
  if (!provided) return false;
  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
