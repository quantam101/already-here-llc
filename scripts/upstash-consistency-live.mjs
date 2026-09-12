import crypto from 'node:crypto';
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error('LIVE CONSISTENCY FAIL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required.');
  process.exit(2);
}

const iterations = Number.parseInt(process.env.UPSTASH_CONSISTENCY_ITERATIONS || '50', 10);
if (!Number.isInteger(iterations) || iterations < 1 || iterations > 500) {
  console.error('LIVE CONSISTENCY FAIL: UPSTASH_CONSISTENCY_ITERATIONS must be an integer from 1 to 500.');
  process.exit(2);
}

const runId = `${Date.now()}-${crypto.randomUUID()}`;
const key = `__ah_ryw_probe__:${runId}`;
const redis = new Redis({ url, token, readYourWrites: true });
const failures = [];

try {
  for (let i = 0; i < iterations; i += 1) {
    const value = JSON.stringify({ runId, i, nonce: crypto.randomUUID() });
    await redis.set(key, value, { ex: 300 });
    const observed = await redis.get(key);
    const observedString = typeof observed === 'string' ? observed : JSON.stringify(observed);

    if (observedString !== value) {
      failures.push({ iteration: i, expected: value, observed: observedString });
      break;
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({
      ok: false,
      test: 'upstash-read-your-writes',
      iterationsAttempted: iterations,
      failures,
      keyNamespace: '__ah_ryw_probe__',
    }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({
      ok: true,
      test: 'upstash-read-your-writes',
      iterations,
      failures: [],
      keyNamespace: '__ah_ryw_probe__',
    }, null, 2));
  }
} finally {
  try {
    await redis.del(key);
    const afterDelete = await redis.get(key);
    if (afterDelete !== null) {
      console.error('LIVE CONSISTENCY FAIL: temporary probe key was not deleted.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`LIVE CONSISTENCY FAIL: cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
