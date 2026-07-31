import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import {
  gincConfig,
  GincMatch,
  GincMember,
  GincNetwork
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

export async function loadNetwork(): Promise<GincNetwork> {
  const redis = getRedis();
  if (redis) {
    const cached = await redis.get<string>('ginc:network');
    if (cached) {
      return typeof cached === 'string' ? (JSON.parse(cached) as GincNetwork) : (cached as unknown as GincNetwork);
    }
    const data = await loadFromDisk();
    await redis.set('ginc:network', JSON.stringify(data));
    return data;
  }
  if (!memoryCache) {
    memoryCache = await loadFromDisk();
  }
  return memoryCache;
}

export async function saveNetwork(data: GincNetwork): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set('ginc:network', JSON.stringify(data));
    return;
  }
  memoryCache = data;
  await saveToDisk(data);
}

export function generateGincId(prefix: 'MEM' | 'LST' | 'JOB'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function cleanInput(value: unknown, max = 3000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const allowedMemberTypes = new Set(['owner', 'renter', 'worker', 'business']);

export async function createGincMemberFromPayload(payload: Record<string, unknown>): Promise<GincMember> {
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

  const member: GincMember = {
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

  const network = await loadNetwork();
  network.members.push(member);
  await saveNetwork(network);
  return member;
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

export async function findMatches(state?: string, category?: string, assetType?: string): Promise<GincMatch[]> {
  const network = await loadNetwork();
  const matches: GincMatch[] = [];

  const targetState = state?.toLowerCase() || '';
  const targetCategory = category?.toLowerCase() || '';
  const targetAssetType = assetType?.toLowerCase() || '';

  for (const listing of network.listings) {
    if (listing.status !== 'available') continue;
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
    if (score > 0) {
      matches.push({ score, listing, reason: reasons.join(', ') });
    }
  }

  for (const job of network.jobs) {
    if (job.status !== 'open') continue;
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
    if (score > 0) {
      matches.push({ score, job, reason: reasons.join(', ') });
    }
  }

  for (const member of network.members) {
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
    if (score > 0) {
      matches.push({ score, member, reason: reasons.join(', ') });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}
