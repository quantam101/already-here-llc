import { createHash } from 'crypto';

const MAX_HASH_LEN = 16;

export function canonicalId(prefix: string, ...components: (string | number | undefined | null)[]): string {
  const value = components
    .filter((c) => c !== undefined && c !== null)
    .map(String)
    .join('::');
  const hash = createHash('sha256').update(value).digest('hex').slice(0, MAX_HASH_LEN);
  return `${prefix}_${hash}`;
}

export function canonicalSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}
