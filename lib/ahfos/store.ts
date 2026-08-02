import { Redis } from '@upstash/redis';
import * as jsonl from './store-jsonl';
import * as redis from './store-redis';

export type {
  Asset,
  Customer,
  Job,
  JobEvent,
  KnowledgeEntry,
  User,
} from './schema';

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const impl = getRedisClient() ? redis : jsonl;

export const getUsers = impl.getUsers;
export const getUserByEmail = impl.getUserByEmail;
export const getUserById = impl.getUserById;
export const createUser = impl.createUser;
export const getCustomers = impl.getCustomers;
export const getCustomerById = impl.getCustomerById;
export const getCustomerByUserId = impl.getCustomerByUserId;
export const createCustomer = impl.createCustomer;
export const updateCustomer = impl.updateCustomer;
export const getJobs = impl.getJobs;
export const getJobById = impl.getJobById;
export const getJobsForCustomer = impl.getJobsForCustomer;
export const getJobsForTechnician = impl.getJobsForTechnician;
export const createJob = impl.createJob;
export const updateJob = impl.updateJob;
export const appendJobEvent = impl.appendJobEvent;
export const getJobEvents = impl.getJobEvents;
export const getAssets = impl.getAssets;
export const getAssetById = impl.getAssetById;
export const createAsset = impl.createAsset;
export const updateAsset = impl.updateAsset;
export const getKnowledgeEntries = impl.getKnowledgeEntries;
export const createKnowledgeEntry = impl.createKnowledgeEntry;
export const getOrCreateCustomerFromRequest = impl.getOrCreateCustomerFromRequest;
