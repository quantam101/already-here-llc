import { getRedis } from './redis';

const inMemoryRateLimits = new Map<string, { count: number; resetAt: number }>();

function firstForwardedAddress(value: string | null): string {
  return value?.split(',')[0]?.trim() ?? '';
}

/**
 * Returns the best proxy-owned client identity available to the deployment.
 *
 * On Vercel, x-vercel-forwarded-for and x-real-ip are populated by the edge.
 * x-forwarded-for is accepted only outside production so local tests and
 * development can identify callers; in production it may be rewritten by an
 * upstream proxy and is not treated as the primary source of truth here.
 */
export function trustedClientKey(request: Request): string {
  const vercelForwarded = firstForwardedAddress(request.headers.get('x-vercel-forwarded-for'));
  if (vercelForwarded) return vercelForwarded;

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  if (process.env.NODE_ENV !== 'production') {
    const forwarded = firstForwardedAddress(request.headers.get('x-forwarded-for'));
    if (forwarded) return forwarded;
  }

  return 'unknown';
}

function inMemoryRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  if (inMemoryRateLimits.size > 10_000) {
    for (const [entryKey, entry] of inMemoryRateLimits) {
      if (entry.resetAt <= now) inMemoryRateLimits.delete(entryKey);
    }
  }
  const current = inMemoryRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    inMemoryRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > maxRequests;
}

/**
 * Distributed fixed-window rate limiter with a local-development fallback.
 * Sensitive production callers can pass requireDistributed=true to fail closed
 * when Upstash is not configured instead of relying on per-instance memory.
 */
export async function rateLimitExceeded(input: {
  scope: string;
  key: string;
  maxRequests: number;
  windowMs: number;
  requireDistributed?: boolean;
}): Promise<boolean> {
  const redis = getRedis();
  const windowSeconds = Math.max(1, Math.ceil(input.windowMs / 1000));
  const bucket = Math.floor(Date.now() / input.windowMs);
  const limiterKey = `rate-limit:${input.scope}:${bucket}:${input.key}`;

  if (redis) {
    const pipeline = redis.multi();
    pipeline.incr(limiterKey);
    pipeline.expire(limiterKey, windowSeconds + 1, 'NX');
    const [count] = (await pipeline.exec()) as [number, unknown];
    return count > input.maxRequests;
  }

  if (input.requireDistributed && process.env.NODE_ENV === 'production') {
    throw new Error('Distributed rate limiter is not configured');
  }

  return inMemoryRateLimited(`rate-limit:${input.scope}:${input.key}`, input.maxRequests, input.windowMs);
}

export function resetRateLimitsForTests(): void {
  inMemoryRateLimits.clear();
}
