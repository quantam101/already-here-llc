import { randomUUID } from 'crypto';
import { mkdir, readdir, readFile, writeFile, appendFile } from 'fs/promises';
import path from 'path';
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

const DATA_DIR = process.env.AHFOS_DATA_DIR || 'data/ahfos';

function dataDir(): string {
  return path.isAbsolute(DATA_DIR) ? DATA_DIR : path.join(/*turbopackIgnore: true*/ process.cwd(), DATA_DIR);
}

async function ensureDir(dir: string): Promise<string> {
  const full = path.join(dataDir(), dir);
  await mkdir(full, { recursive: true });
  return full;
}

async function readJsonDir<T>(dir: string, schema: z.ZodType<T>): Promise<T[]> {
  const full = await ensureDir(dir);
  const entries: T[] = [];
  let names: string[] = [];
  try {
    names = await readdir(full);
  } catch {
    return entries;
  }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try {
      const text = await readFile(path.join(full, name), 'utf8');
      const parsed = JSON.parse(text);
      entries.push(schema.parse(parsed));
    } catch {
      // skip corrupt records
    }
  }
  return entries;
}

async function readJsonFile<T>(dir: string, id: string, schema: z.ZodType<T>): Promise<T | null> {
  const full = path.join(await ensureDir(dir), `${id}.json`);
  try {
    const text = await readFile(full, 'utf8');
    return schema.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

async function writeJsonFile(dir: string, id: string, value: unknown): Promise<void> {
  const full = path.join(await ensureDir(dir), `${id}.json`);
  await writeFile(full, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function appendJsonLine(dir: string, value: unknown): Promise<void> {
  const full = path.join(await ensureDir(dir), 'log.jsonl');
  await appendFile(full, JSON.stringify(value) + '\n', 'utf8');
}

export async function getUsers(): Promise<User[]> {
  return readJsonDir('users', UserSchema);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.email === email.toLowerCase()) || null;
}

export async function getUserById(id: string): Promise<User | null> {
  return readJsonFile('users', id, UserSchema);
}

export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const existing = await getUserByEmail(user.email);
  if (existing) throw new Error('Email already registered.');
  const full: User = { ...user, id: randomUUID(), createdAt: new Date().toISOString() };
  await writeJsonFile('users', full.id, full);
  return full;
}

export async function getCustomers(): Promise<Customer[]> {
  return readJsonDir('customers', CustomerSchema);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return readJsonFile('customers', id, CustomerSchema);
}

export async function getCustomerByUserId(userId: string): Promise<Customer | null> {
  const customers = await getCustomers();
  return customers.find((c) => c.userId === userId) || null;
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
  const full: Customer = { ...customer, id: randomUUID(), createdAt: new Date().toISOString() };
  await writeJsonFile('customers', full.id, full);
  return full;
}

export async function updateCustomer(customer: Customer): Promise<Customer> {
  await writeJsonFile('customers', customer.id, customer);
  return customer;
}

export async function getJobs(): Promise<Job[]> {
  return readJsonDir('jobs', JobSchema);
}

export async function getJobById(id: string): Promise<Job | null> {
  return readJsonFile('jobs', id, JobSchema);
}

export async function getJobsForCustomer(customerId: string): Promise<Job[]> {
  const jobs = await getJobs();
  return jobs.filter((j) => j.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getJobsForTechnician(technicianId: string): Promise<Job[]> {
  const jobs = await getJobs();
  return jobs.filter((j) => j.assignedTo === technicianId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createJob(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
  const now = new Date().toISOString();
  const full: Job = { ...job, id: randomUUID(), createdAt: now, updatedAt: now };
  await writeJsonFile('jobs', full.id, full);
  return full;
}

export async function updateJob(job: Job): Promise<Job> {
  const updated = { ...job, updatedAt: new Date().toISOString() };
  await writeJsonFile('jobs', updated.id, updated);
  return updated;
}

export async function appendJobEvent(event: Omit<JobEvent, 'id'>): Promise<JobEvent> {
  const full: JobEvent = { ...event, id: randomUUID() };
  await appendJsonLine('events', full);
  return full;
}

export async function getJobEvents(jobId: string): Promise<JobEvent[]> {
  const full = path.join(await ensureDir('events'), 'log.jsonl');
  let text = '';
  try {
    text = await readFile(full, 'utf8');
  } catch {
    return [];
  }
  const events: JobEvent[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JobEventSchema.parse(JSON.parse(line));
      if (parsed.jobId === jobId) events.push(parsed);
    } catch {
      // skip corrupt lines
    }
  }
  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function getAssets(): Promise<Asset[]> {
  return readJsonDir('assets', AssetSchema);
}

export async function getAssetById(id: string): Promise<Asset | null> {
  return readJsonFile('assets', id, AssetSchema);
}

export async function createAsset(asset: Omit<Asset, 'id' | 'createdAt'>): Promise<Asset> {
  const full: Asset = { ...asset, id: randomUUID(), createdAt: new Date().toISOString() };
  await writeJsonFile('assets', full.id, full);
  return full;
}

export async function updateAsset(asset: Asset): Promise<Asset> {
  await writeJsonFile('assets', asset.id, asset);
  return asset;
}

export async function getKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  return readJsonDir('knowledge', KnowledgeEntrySchema);
}

export async function createKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>): Promise<KnowledgeEntry> {
  const full: KnowledgeEntry = { ...entry, id: randomUUID(), createdAt: new Date().toISOString() };
  await writeJsonFile('knowledge', full.id, full);
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
  await writeJsonFile('customers', customer.id, customer);
  return customer;
}
