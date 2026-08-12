import { promises as fs } from 'fs';
import path from 'path';
import { getRedis } from '@/lib/redis';

export interface AuditEvent {
  action: string;
  actor?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const auditPath = path.join(process.cwd(), 'data', 'ginc-audit.jsonl');

export async function logAudit(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
  const entry: AuditEvent = { ...event, timestamp: new Date().toISOString() };
  const redis = getRedis();
  if (redis) {
    await redis.lpush('ginc:audit', JSON.stringify(entry));
    await redis.ltrim('ginc:audit', 0, 9999);
    return;
  }
  try {
    await fs.mkdir(path.dirname(auditPath), { recursive: true });
    await fs.appendFile(auditPath, JSON.stringify(entry) + '\n');
  } catch {
    // ignore in read-only environments
  }
}

export async function getRecentAudit(limit = 100): Promise<AuditEvent[]> {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 1000) : 100;
  const redis = getRedis();
  if (redis) {
    const items = await redis.lrange<string>('ginc:audit', 0, safeLimit - 1);
    return (items || []).map((item) => (typeof item === 'string' ? JSON.parse(item) : item));
  }
  try {
    const raw = await fs.readFile(auditPath, 'utf-8');
    return raw
      .split('\n')
      .filter(Boolean)
      .slice(-safeLimit)
      .map((line) => JSON.parse(line) as AuditEvent)
      .reverse();
  } catch {
    return [];
  }
}
