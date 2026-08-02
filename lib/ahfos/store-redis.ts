import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import {
  Asset,
  AssetSchema,
  Customer,
  CustomerSchema,
  Job,
  JobEvent,
  JobEventSchema,
  JobSchema,
  KnowledgeEntry,
  KnowledgeEntrySchema,
  User,
  UserSchema,
} from './schema';

const PREFIX = 'ahfos';

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = getRedis();

function key(parts: string[]): string {
  return [PREFIX, ...parts].join(':');
}

function parse<T>(value: unknown, schema: z.ZodType<T>): T | null {
  if (typeof value !== 'string') return null;
  try {
    return schema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}

async function getById<T>(id: string, parts: string[], schema: z.ZodType<T>): Promise<T | null> {
  if (!redis) return null;
  const value = await redis.get<string>(key([...parts, id]));
  return parse(value, schema);
}

async function multiGet<T>(ids: string[], parts: string[], schema: z.ZodType<T>): Promise<T[]> {
  if (!redis || ids.length === 0) return [];
  const values = await redis.mget<string[]>(ids.map((id) => key([...parts, id])));
  const entries: T[] = [];
  for (const value of values) {
    const parsed = parse(value, schema);
    if (parsed) entries.push(parsed);
  }
  return entries;
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUsers(): Promise<User[]> {
  if (!redis) return [];
  const ids = await redis.smembers(key(['users']));
  return sortByCreatedAtDesc(await multiGet(ids, ['user'], UserSchema));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (!redis) return null;
  const id = await redis.get<string>(key(['user', 'email', email.toLowerCase()]));
  if (!id) return null;
  return getById(id, ['user'], UserSchema);
}

export async function getUserById(id: string): Promise<User | null> {
  return getById(id, ['user'], UserSchema);
}

export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  if (!redis) throw new Error('Redis not configured.');
  const existing = await getUserByEmail(user.email);
  if (existing) throw new Error('Email already registered.');
  const full: User = { ...user, id: randomUUID(), createdAt: new Date().toISOString() };
  await redis.set(key(['user', full.id]), JSON.stringify(full));
  await redis.sadd(key(['users']), full.id);
  await redis.set(key(['user', 'email', full.email]), full.id);
  return full;
}

export async function getCustomers(): Promise<Customer[]> {
  if (!redis) return [];
  const ids = await redis.smembers(key(['customers']));
  return sortByCreatedAtDesc(await multiGet(ids, ['customer'], CustomerSchema));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return getById(id, ['customer'], CustomerSchema);
}

export async function getCustomerByUserId(userId: string): Promise<Customer | null> {
  if (!redis) return null;
  const id = await redis.get<string>(key(['customer', 'user', userId]));
  if (!id) return null;
  return getById(id, ['customer'], CustomerSchema);
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
  if (!redis) throw new Error('Redis not configured.');
  const full: Customer = { ...customer, id: randomUUID(), createdAt: new Date().toISOString() };
  await redis.set(key(['customer', full.id]), JSON.stringify(full));
  await redis.sadd(key(['customers']), full.id);
  if (full.userId) {
    await redis.set(key(['customer', 'user', full.userId]), full.id);
  }
  return full;
}

export async function updateCustomer(customer: Customer): Promise<Customer> {
  if (!redis) throw new Error('Redis not configured.');
  await redis.set(key(['customer', customer.id]), JSON.stringify(customer));
  return customer;
}

export async function getJobs(): Promise<Job[]> {
  if (!redis) return [];
  const ids = await redis.smembers(key(['jobs']));
  return sortByCreatedAtDesc(await multiGet(ids, ['job'], JobSchema));
}

export async function getJobById(id: string): Promise<Job | null> {
  return getById(id, ['job'], JobSchema);
}

export async function getJobsForCustomer(customerId: string): Promise<Job[]> {
  if (!redis) return [];
  const ids = await redis.smembers(key(['jobs', 'customer', customerId]));
  return sortByCreatedAtDesc(await multiGet(ids, ['job'], JobSchema));
}

export async function getJobsForTechnician(technicianId: string): Promise<Job[]> {
  if (!redis) return [];
  const ids = await redis.smembers(key(['jobs', 'technician', technicianId]));
  return sortByCreatedAtDesc(await multiGet(ids, ['job'], JobSchema));
}

export async function createJob(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
  if (!redis) throw new Error('Redis not configured.');
  const now = new Date().toISOString();
  const full: Job = { ...job, id: randomUUID(), createdAt: now, updatedAt: now };
  await redis.set(key(['job', full.id]), JSON.stringify(full));
  await redis.sadd(key(['jobs']), full.id);
  await redis.sadd(key(['jobs', 'customer', full.customerId]), full.id);
  if (full.assignedTo) {
    await redis.sadd(key(['jobs', 'technician', full.assignedTo]), full.id);
  }
  return full;
}

export async function updateJob(job: Job): Promise<Job> {
  if (!redis) throw new Error('Redis not configured.');
  const old = await getJobById(job.id);
  const updated = { ...job, updatedAt: new Date().toISOString() };
  await redis.set(key(['job', updated.id]), JSON.stringify(updated));

  if (old) {
    if (old.customerId !== updated.customerId) {
      await redis.srem(key(['jobs', 'customer', old.customerId]), updated.id);
      await redis.sadd(key(['jobs', 'customer', updated.customerId]), updated.id);
    }
    if (old.assignedTo !== updated.assignedTo) {
      if (old.assignedTo) await redis.srem(key(['jobs', 'technician', old.assignedTo]), updated.id);
      if (updated.assignedTo) await redis.sadd(key(['jobs', 'technician', updated.assignedTo]), updated.id);
    }
  } else {
    await redis.sadd(key(['jobs']), updated.id);
    await redis.sadd(key(['jobs', 'customer', updated.customerId]), updated.id);
    if (updated.assignedTo) {
      await redis.sadd(key(['jobs', 'technician', updated.assignedTo]), updated.id);
    }
  }
  return updated;
}

export async function appendJobEvent(event: Omit<JobEvent, 'id'>): Promise<JobEvent> {
  if (!redis) throw new Error('Redis not configured.');
  const full: JobEvent = { ...event, id: randomUUID() };
  await redis.rpush(key(['events', event.jobId]), JSON.stringify(full));
  return full;
}

export async function getJobEvents(jobId: string): Promise<JobEvent[]> {
  if (!redis) return [];
  const lines = await redis.lrange<string>(key(['events', jobId]), 0, -1);
  const events: JobEvent[] = [];
  for (const line of lines) {
    const parsed = parse(line, JobEventSchema);
    if (parsed && parsed.jobId === jobId) events.push(parsed);
  }
  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function getAssets(): Promise<Asset[]> {
  if (!redis) return [];
  const ids = await redis.smembers(key(['assets']));
  return sortByCreatedAtDesc(await multiGet(ids, ['asset'], AssetSchema));
}

export async function getAssetById(id: string): Promise<Asset | null> {
  return getById(id, ['asset'], AssetSchema);
}

export async function createAsset(asset: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> {
  if (!redis) throw new Error('Redis not configured.');
  const full: Asset = { ...asset, id: randomUUID(), createdAt: new Date().toISOString() };
  await redis.set(key(['asset', full.id]), JSON.stringify(full));
  await redis.sadd(key(['assets']), full.id);
  await redis.sadd(key(['assets', 'customer', full.customerId]), full.id);
  return full;
}

export async function updateAsset(asset: Asset): Promise<Asset> {
  if (!redis) throw new Error('Redis not configured.');
  const old = await getAssetById(asset.id);
  await redis.set(key(['asset', asset.id]), JSON.stringify(asset));
  if (old && old.customerId !== asset.customerId) {
    await redis.srem(key(['assets', 'customer', old.customerId]), asset.id);
    await redis.sadd(key(['assets', 'customer', asset.customerId]), asset.id);
  }
  return asset;
}

export async function getKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  if (!redis) return [];
  const ids = await redis.smembers(key(['knowledge']));
  return sortByCreatedAtDesc(await multiGet(ids, ['knowledge', 'entry'], KnowledgeEntrySchema));
}

export async function createKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>): Promise<KnowledgeEntry> {
  if (!redis) throw new Error('Redis not configured.');
  const full: KnowledgeEntry = { ...entry, id: randomUUID(), createdAt: new Date().toISOString() };
  await redis.set(key(['knowledge', 'entry', full.id]), JSON.stringify(full));
  await redis.sadd(key(['knowledge']), full.id);
  return full;
}

export async function getOrCreateCustomerFromRequest(
  request: {
    name: string;
    company: string;
    email: string;
    phone: string;
    address: { city: string; state: string };
  },
  userId?: string,
): Promise<Customer> {
  if (userId) {
    const existing = await getCustomerByUserId(userId);
    if (existing) return existing;
  }
  const byEmail = await getUserByEmail(request.email);
  if (byEmail) {
    const existing = await getCustomerByUserId(byEmail.id);
    if (existing) return existing;
  }
  const customer: Customer = {
    id: randomUUID(),
    userId: userId || '',
    name: request.name,
    company: request.company,
    phone: request.phone,
    email: request.email,
    addresses: [],
    createdAt: new Date().toISOString(),
  };
  await redis?.set(key(['customer', customer.id]), JSON.stringify(customer));
  await redis?.sadd(key(['customers']), customer.id);
  if (customer.userId) {
    await redis?.set(key(['customer', 'user', customer.userId]), customer.id);
  }
  return customer;
}
