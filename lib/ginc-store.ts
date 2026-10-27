import type { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { getRedis } from '@/lib/redis';
import { gincConfig } from '@/lib/ginc';
import type {
  GincJob,
  GincListing,
  GincMatch,
  GincMember,
  GincNetwork,
  PublicMember
} from '@/lib/ginc';

export { gincConfig };

const dataPath = path.join(process.cwd(), 'data', 'ginc-network.json');

let memoryCache: GincNetwork | null = null;

function emptyNetwork(): GincNetwork {
  return { members: [], listings: [], jobs: [] };
}

async function loadFromDisk(): Promise<GincNetwork> {
  try {
    const raw = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(raw) as GincNetwork;
  } catch {
    // No fabricated demo members/listings — an empty network is the
    // honest starting state until real records arrive.
    return emptyNetwork();
  }
}

async function saveToDisk(data: GincNetwork): Promise<void> {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch {
    // ignore in read-only environments
  }
}

async function loadRedisList<T>(redis: Redis, key: string): Promise<T[]> {
  const items = await redis.lrange<T>(key, 0, -1);
  return (items || []).map((item) => (typeof item === 'string' ? JSON.parse(item) : item));
}

export async function loadNetwork(retries = 3): Promise<GincNetwork> {
  const redis = getRedis();
  if (redis) {
    const [members, listings, jobs] = await Promise.all([
      loadRedisList<GincMember>(redis, 'ginc:members'),
      loadRedisList<GincListing>(redis, 'ginc:listings'),
      loadRedisList<GincJob>(redis, 'ginc:jobs')
    ]);

    if (members.length > 0 || listings.length > 0 || jobs.length > 0) {
      return { members, listings, jobs };
    }

    // Lists are empty — migrate legacy/file data once using a
    // short-lived lock to avoid duplicate work. There is no demo
    // seed: a genuinely empty network stays empty.
    const lockAcquired = await redis.set('ginc:seeded', '1', { nx: true, ex: 30 });
    if (lockAcquired === 'OK') {
      try {
        const legacy = await redis.get<string>('ginc:network');
        const data = legacy
          ? (typeof legacy === 'string' ? (JSON.parse(legacy) as GincNetwork) : (legacy as unknown as GincNetwork))
          : await loadFromDisk();
        // Legacy/file backups may still carry the old fabricated seed
        // records — never re-import them after they've been purged.
        data.members = data.members.filter((m) => !GINC_SAMPLE_ID_SET.has(m.id));
        data.listings = data.listings.filter((l) => !GINC_SAMPLE_ID_SET.has(l.id));
        data.jobs = data.jobs.filter((j) => !GINC_SAMPLE_ID_SET.has(j.id));
        if (data.members.length || data.listings.length || data.jobs.length) {
          await saveNetwork(data);
          return data;
        }
      } finally {
        // Lock expires automatically; no need to delete.
      }
      return emptyNetwork();
    }
    if (retries > 0) {
      // Another process is migrating; wait briefly and re-read.
      await new Promise((resolve) => setTimeout(resolve, 100));
      return loadNetwork(retries - 1);
    }
    return emptyNetwork();
  }

  if (!memoryCache) {
    memoryCache = await loadFromDisk();
  }
  return memoryCache;
}

export async function saveNetwork(data: GincNetwork): Promise<void> {
  const redis = getRedis();
  if (redis) {
    // Redis persistence uses per-entity lists; this path is kept for bulk seeding only.
    const pipeline = redis.multi();
    pipeline.del('ginc:members', 'ginc:listings', 'ginc:jobs');
    for (const member of data.members) pipeline.rpush('ginc:members', JSON.stringify(member));
    for (const listing of data.listings) pipeline.rpush('ginc:listings', JSON.stringify(listing));
    for (const job of data.jobs) pipeline.rpush('ginc:jobs', JSON.stringify(job));
    await pipeline.exec();
    return;
  }
  memoryCache = data;
  await saveToDisk(data);
}

export async function addMember(member: GincMember): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.rpush('ginc:members', JSON.stringify(member));
    return;
  }
  const network = await loadNetwork();
  network.members.push(member);
  await saveNetwork(network);
}

export async function addListing(listing: GincListing): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.rpush('ginc:listings', JSON.stringify(listing));
    return;
  }
  const network = await loadNetwork();
  network.listings.push(listing);
  await saveNetwork(network);
}

export async function addJob(job: GincJob): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.rpush('ginc:jobs', JSON.stringify(job));
    return;
  }
  const network = await loadNetwork();
  network.jobs.push(job);
  await saveNetwork(network);
}

// Ids of the old fabricated seed records — filtered out during
// migration so a purge is permanent. Exported for the admin route.
export const GINC_SAMPLE_ID_SET = new Set(['MEM-001', 'MEM-002', 'LST-001', 'JOB-001']);

const GINC_LIST_KEYS = {
  member: 'ginc:members',
  listing: 'ginc:listings',
  job: 'ginc:jobs',
} as const;

export type GincEntityKind = keyof typeof GINC_LIST_KEYS;

/**
 * Remove a GINC record by id. Redis removes the matching element with
 * LREM (atomic — no read-modify-write window); the file/memory
 * fallback filters in place. Returns true when a record was removed.
 */
export async function removeGincRecord(kind: GincEntityKind, id: string): Promise<boolean> {
  const key = GINC_LIST_KEYS[kind];
  const redis = getRedis();

  const pickList = (network: GincNetwork) =>
    kind === 'member' ? network.members : kind === 'listing' ? network.listings : network.jobs;

  if (redis) {
    // LREM on the raw serialized element is atomic — a read-modify-
    // write replacement could silently drop a concurrent submission.
    const raw = await redis.lrange<string>(key, 0, -1);
    let removed = false;
    for (const item of raw) {
      const parsed = typeof item === 'string' ? (JSON.parse(item) as { id?: string }) : item;
      if (parsed.id === id) {
        await redis.lrem(key, 0, item);
        removed = true;
      }
    }
    return removed;
  }

  const network = await loadNetwork();
  const list = pickList(network);
  const kept = list.filter((item) => item.id !== id);
  if (kept.length === list.length) return false;
  if (kind === 'member') network.members = kept as GincNetwork['members'];
  else if (kind === 'listing') network.listings = kept as GincNetwork['listings'];
  else network.jobs = kept as GincNetwork['jobs'];
  memoryCache = network;
  await saveToDisk(network);
  return true;
}

// Removes records whose ids are in the given set across all three lists.
// Used by the admin cleanup route to purge leftover sample data.
export async function purgeGincRecords(ids: string[]): Promise<{ removed: string[] }> {
  const targets = new Set(ids);
  const removed: string[] = [];
  for (const kind of Object.keys(GINC_LIST_KEYS) as GincEntityKind[]) {
    const redis = getRedis();
    const key = GINC_LIST_KEYS[kind];
    if (redis) {
      const raw = await redis.lrange<string>(key, 0, -1);
      for (const item of raw) {
        const parsed = typeof item === 'string' ? (JSON.parse(item) as { id?: string }) : item;
        if (targets.has(parsed.id ?? '')) {
          await redis.lrem(key, 0, item);
          removed.push(parsed.id ?? '');
        }
      }
    } else {
      const network = await loadNetwork();
      const list = kind === 'member' ? network.members : kind === 'listing' ? network.listings : network.jobs;
      const kept = list.filter((item) => !targets.has(item.id));
      for (const item of list) if (targets.has(item.id)) removed.push(item.id);
      if (kept.length !== list.length) {
        if (kind === 'member') network.members = kept as GincNetwork['members'];
        else if (kind === 'listing') network.listings = kept as GincNetwork['listings'];
        else network.jobs = kept as GincNetwork['jobs'];
        memoryCache = network;
        await saveToDisk(network);
      }
    }
  }
  return { removed };
}

export function generateGincId(prefix: 'MEM' | 'LST' | 'JOB'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function cleanInput(value: unknown, max = 3000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const allowedMemberTypes = new Set(['owner', 'renter', 'worker', 'business']);
const allowedMemberRoles = new Set(['admin', 'moderator', 'member']);

export function buildGincMember(payload: Record<string, unknown>): GincMember {
  const type = cleanInput(payload.type, 40);
  if (!allowedMemberTypes.has(type)) {
    throw new Error('Invalid member type.');
  }
  const fullName = cleanInput(payload.fullName, 120);
  const email = cleanInput(payload.email, 160);
  const phone = cleanInput(payload.phone, 40);
  const city = cleanInput(payload.city, 120);
  const state = cleanInput(payload.state, 40);
  const zip = cleanInput(payload.zip, 20);
  if (!fullName || !email || !phone || !city || !state) {
    throw new Error('Missing required member fields.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address.');
  }

  const role = cleanInput(payload.role, 20);
  const memberRole = allowedMemberRoles.has(role) ? (role as GincMember['role']) : 'member';

  return {
    id: generateGincId('MEM'),
    type: type as GincMember['type'],
    role: memberRole,
    fullName,
    email,
    phone,
    city,
    state,
    zip,
    skills: cleanInput(payload.skills, 1500),
    bio: cleanInput(payload.bio, 3000),
    createdAt: new Date().toISOString()
  };
}

export async function createGincMemberFromPayload(payload: Record<string, unknown>): Promise<GincMember> {
  const member = buildGincMember(payload);
  await addMember(member);
  return member;
}

export function sanitizeMember(member: GincMember): PublicMember {
  const publicFields = Object.fromEntries(
    Object.entries(member).filter(([key]) => key !== 'email' && key !== 'phone' && key !== 'zip')
  ) as PublicMember;
  return publicFields;
}

// Rate limiting: Redis-backed when available, otherwise per-instance in-memory.
const inMemoryRateLimits = new Map<string, { count: number; resetAt: number }>();

export async function isRateLimited(key: string, maxRequests = 5, windowSeconds = 60): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const rateKey = `ginc:ratelimit:${key}`;
    const pipeline = redis.multi();
    pipeline.incr(rateKey);
    pipeline.expire(rateKey, windowSeconds, 'NX');
    const [count] = (await pipeline.exec()) as [number, unknown];
    return count > maxRequests;
  }

  const now = Date.now();
  const current = inMemoryRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    inMemoryRateLimits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > maxRequests;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
}

function scoreTokens(a: string, b: string): number {
  const aTokens = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const bTokens = normalize(b).split(/\s+/).filter(Boolean);
  let matches = 0;
  for (const token of bTokens) {
    if (aTokens.has(token)) matches += 1;
  }
  return matches / Math.max(aTokens.size, bTokens.length);
}

function scoreListing(listing: GincListing, targetState: string, targetCategory: string, targetAssetType: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (targetState && listing.state.toLowerCase() === targetState) {
    score += 25;
    reasons.push('same state');
  }
  if (targetCategory && listing.category.toLowerCase().includes(targetCategory)) {
    score += 20;
    reasons.push('category match');
  }
  if (targetAssetType) {
    const tokenScore = scoreTokens(listing.assetType + ' ' + listing.title + ' ' + listing.description, targetAssetType);
    score += Math.round(tokenScore * 30);
    if (tokenScore > 0) reasons.push('asset/type match');
  }
  return { score, reasons };
}

function scoreJob(job: GincJob, targetState: string, targetCategory: string, targetAssetType: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (targetState && job.state.toLowerCase() === targetState) {
    score += 25;
    reasons.push('same state');
  }
  if (targetCategory && job.category.toLowerCase().includes(targetCategory)) {
    score += 20;
    reasons.push('category match');
  }
  if (targetAssetType) {
    const tokenScore = scoreTokens(job.assetType + ' ' + job.title + ' ' + job.description, targetAssetType);
    score += Math.round(tokenScore * 30);
    if (tokenScore > 0) reasons.push('asset/type match');
  }
  return { score, reasons };
}

function scoreMember(member: GincMember, targetState: string, targetCategory: string, targetAssetType: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (targetState && member.state.toLowerCase() === targetState) {
    score += 20;
    reasons.push('same state');
  }
  if (targetCategory || targetAssetType) {
    const text = `${member.bio || ''} ${member.skills || ''}`;
    const tokenScore = scoreTokens(text, `${targetCategory} ${targetAssetType}`);
    score += Math.round(tokenScore * 25);
    if (tokenScore > 0) reasons.push('profile match');
  }
  return { score, reasons };
}

export async function findMatches(state?: string, category?: string, assetType?: string): Promise<GincMatch[]> {
  const network = await loadNetwork();
  const matches: GincMatch[] = [];

  const targetState = state?.toLowerCase() || '';
  const targetCategory = category?.toLowerCase() || '';
  const targetAssetType = assetType?.toLowerCase() || '';
  const hasFilter = targetState || targetCategory || targetAssetType;

  const availableListings = network.listings.filter((l) => l.status === 'available');
  const openJobs = network.jobs.filter((j) => j.status === 'open');

  if (hasFilter) {
    for (const listing of availableListings) {
      const { score, reasons } = scoreListing(listing, targetState, targetCategory, targetAssetType);
      if (score > 0) {
        matches.push({ score, listing, reason: reasons.join(', ') });
      }
    }

    for (const job of openJobs) {
      const { score, reasons } = scoreJob(job, targetState, targetCategory, targetAssetType);
      if (score > 0) {
        matches.push({ score, job, reason: reasons.join(', ') });
      }
    }

    for (const member of network.members) {
      const { score, reasons } = scoreMember(member, targetState, targetCategory, targetAssetType);
      if (score > 0) {
        matches.push({ score, member: sanitizeMember(member), reason: reasons.join(', ') });
      }
    }
  } else {
    // Default view: cross-match open jobs against available listings
    for (const job of openJobs) {
      for (const listing of availableListings) {
        let score = 0;
        const reasons: string[] = [];
        if (job.state.toLowerCase() === listing.state.toLowerCase()) {
          score += 25;
          reasons.push('same state');
        }
        if (
          job.category.toLowerCase().includes(listing.category.toLowerCase()) ||
          listing.category.toLowerCase().includes(job.category.toLowerCase())
        ) {
          score += 20;
          reasons.push('category match');
        }
        const tokenScore = scoreTokens(
          listing.assetType + ' ' + listing.title + ' ' + listing.description,
          job.assetType + ' ' + job.title + ' ' + job.description
        );
        score += Math.round(tokenScore * 30);
        if (tokenScore > 0) reasons.push('asset/type match');

        if (score >= 25) {
          matches.push({ score, listing, job, reason: reasons.join(', ') });
        }
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}
