function lastIp(value: string): string {
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

/**
 * Extract a client identifier from platform-controlled headers first.
 * Vercel-controlled headers are preferred because they cannot be spoofed by the client.
 */
export function clientKey(request: Request): string {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')?.trim();
  if (vercelForwarded) return lastIp(vercelForwarded);

  const vercelIp = request.headers.get('x-vercel-ip')?.trim();
  if (vercelIp) return vercelIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const last = lastIp(forwarded);
    if (last) return last;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}
