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

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export function normalizePhone(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^0-9+]/g, '');
}

export function normalizeDomain(value: unknown, website?: unknown, email?: unknown): string {
  const explicit = typeof value === 'string' ? value.trim().toLowerCase().replace(/^www\./, '') : '';
  if (explicit && explicit.includes('.')) return explicit;
  const urlish = typeof website === 'string' ? website.trim() : '';
  if (urlish) {
    try {
      const url = new URL(urlish.includes('://') ? urlish : `https://${urlish}`);
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (host.includes('.')) return host;
    } catch {
      // fall through to email
    }
  }
  const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const at = mail.indexOf('@');
  if (at > 0 && at < mail.length - 1) {
    const host = mail.slice(at + 1);
    if (host.includes('.')) return host;
  }
  return '';
}
