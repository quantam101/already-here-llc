import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import {
  gincConfig,
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

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function seedNetwork(): GincNetwork {
  return {
    members: [
      {
        id: 'MEM-001',
        type: 'owner',
        fullName: 'Sample Owner',
        email: 'owner@example.com',
        phone: '602-000-0001',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85007',
        skills: 'Has utility trailer, small truck, and tools.',
        bio: 'Local contractor with extra equipment looking to rent or partner on jobs.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'MEM-002',
        type: 'business',
        fullName: 'Sample Roofing Crew',
        email: 'crew@example.com',
        phone: '602-000-0002',
        city: 'Tempe',
        state: 'AZ',
        zip: '85281',
        skills: 'Roofing, gutters, dump runs.',
        bio: 'Need a trailer a few times a month and extra labor on big jobs.',
        createdAt: new Date().toISOString()
      }
    ],
    listings: [
      {
        id: 'LST-001',
        memberId: 'MEM-001',
        title: 'Utility trailer for dump runs',
        category: 'Construction & landscaping',
        assetType: 'Trailer',
        city: 'Phoenix',
        state: 'AZ',
        price: '$75',
        period: 'day',
        description: '14ft utility trailer available for dump runs and material hauling.',
        status: 'available',
        createdAt: new Date().toISOString()
      }
    ],
    jobs: [
      {
        id: 'JOB-001',
        memberId: 'MEM-002',
        title: 'Roof tear-off helper + trailer needed',
        category: 'Roofing / trades',
        assetType: 'Trailer',
        city: 'Tempe',
        state: 'AZ',
        schedule: 'Weekends and some weekdays',
        budget: '$200/day',
        description: 'Need an extra person and a trailer for shingle tear-offs. Could become regular work.',
        status: 'open',
        createdAt: new Date().toISOString()
      }
    ]
  };
}

async function loadFromDisk(): Promise<GincNetwork> {
  try {
    const raw = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(raw) as GincNetwork;
  } catch {
    return seedNetwork();
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

export async function loadNetwork(): Promise<GincNetwork> {
  const redis = getRedis();
  if (redis) {
    const [members, listings, jobs] = await Promise.all([
      loadRedisList<GincMember>(redis, 'ginc:members'),
      loadRedisList<GincListing>(redis, 'ginc:listings'),
      loadRedisList<GincJob>(redis, 'ginc:jobs')
    ]);
    return { members, listings, jobs };
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

export function generateGincId(prefix: 'MEM' | 'LST' | 'JOB'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function cleanInput(value: unknown, max = 3000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const allowedMemberTypes = new Set(['owner', 'renter', 'worker', 'business']);

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

  return {
    id: generateGincId('MEM'),
    type: type as GincMember['type'],
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
    const count = await redis.incr(`ginc:ratelimit:${key}`);
    if (count === 1) {
      await redis.expire(`ginc:ratelimit:${key}`, windowSeconds);
    }
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
