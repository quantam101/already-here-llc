import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ITERATIONS = 25;

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'preview_only' }, { status: 403 });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: 'upstash_not_configured' }, { status: 503 });
  }

  const redis = new Redis({ url, token, enableTelemetry: false });
  const key = `__ah_ryw_probe__:${crypto.randomUUID()}`;
  const failures: Array<{ iteration: number; expected: string; observed: unknown }> = [];
  let syncTokenObserved = false;

  try {
    for (let iteration = 1; iteration <= ITERATIONS; iteration += 1) {
      const expected = `${Date.now()}:${iteration}:${crypto.randomUUID()}`;
      await redis.set(key, expected, { ex: 120 });
      syncTokenObserved ||= Boolean(redis.readYourWritesSyncToken);
      const observed = await redis.get<string>(key);
      if (observed !== expected) {
        failures.push({ iteration, expected, observed });
        break;
      }
    }

    return NextResponse.json(
      {
        ok: failures.length === 0 && syncTokenObserved,
        iterations: ITERATIONS,
        failures,
        sync_token_observed: syncTokenObserved,
        key_namespace: '__ah_ryw_probe__',
      },
      { status: failures.length === 0 && syncTokenObserved ? 200 : 500 }
    );
  } finally {
    await redis.del(key).catch(() => undefined);
  }
}
