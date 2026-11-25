import { Redis } from '@upstash/redis';

let sharedRedis: Redis | null = null;
let sharedRedisConfigKey: string | null = null;

export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    sharedRedis = null;
    sharedRedisConfigKey = null;
    return null;
  }

  const configKey = `${url}\n${token}`;
  if (!sharedRedis || sharedRedisConfigKey !== configKey) {
    sharedRedis = new Redis({ url, token });
    sharedRedisConfigKey = configKey;
  }
  return sharedRedis;
}
