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

function shouldUseRedis(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}

function impl() {
  return shouldUseRedis() ? redis : jsonl;
}

export const getUsers = async (...args: Parameters<typeof jsonl.getUsers>) => impl().getUsers(...args);
export const getUserByEmail = async (...args: Parameters<typeof jsonl.getUserByEmail>) => impl().getUserByEmail(...args);
export const getUserById = async (...args: Parameters<typeof jsonl.getUserById>) => impl().getUserById(...args);
export const createUser = async (...args: Parameters<typeof jsonl.createUser>) => impl().createUser(...args);
export const getCustomers = async (...args: Parameters<typeof jsonl.getCustomers>) => impl().getCustomers(...args);
export const getCustomerById = async (...args: Parameters<typeof jsonl.getCustomerById>) => impl().getCustomerById(...args);
export const getCustomerByUserId = async (...args: Parameters<typeof jsonl.getCustomerByUserId>) => impl().getCustomerByUserId(...args);
export const createCustomer = async (...args: Parameters<typeof jsonl.createCustomer>) => impl().createCustomer(...args);
export const updateCustomer = async (...args: Parameters<typeof jsonl.updateCustomer>) => impl().updateCustomer(...args);
export const getJobs = async (...args: Parameters<typeof jsonl.getJobs>) => impl().getJobs(...args);
export const getJobById = async (...args: Parameters<typeof jsonl.getJobById>) => impl().getJobById(...args);
export const getJobsForCustomer = async (...args: Parameters<typeof jsonl.getJobsForCustomer>) => impl().getJobsForCustomer(...args);
export const getJobsForTechnician = async (...args: Parameters<typeof jsonl.getJobsForTechnician>) => impl().getJobsForTechnician(...args);
export const createJob = async (...args: Parameters<typeof jsonl.createJob>) => impl().createJob(...args);
export const updateJob = async (...args: Parameters<typeof jsonl.updateJob>) => impl().updateJob(...args);
export const appendJobEvent = async (...args: Parameters<typeof jsonl.appendJobEvent>) => impl().appendJobEvent(...args);
export const getJobEvents = async (...args: Parameters<typeof jsonl.getJobEvents>) => impl().getJobEvents(...args);
export const getAssets = async (...args: Parameters<typeof jsonl.getAssets>) => impl().getAssets(...args);
export const getAssetById = async (...args: Parameters<typeof jsonl.getAssetById>) => impl().getAssetById(...args);
export const createAsset = async (...args: Parameters<typeof jsonl.createAsset>) => impl().createAsset(...args);
export const updateAsset = async (...args: Parameters<typeof jsonl.updateAsset>) => impl().updateAsset(...args);
export const getKnowledgeEntries = async (...args: Parameters<typeof jsonl.getKnowledgeEntries>) => impl().getKnowledgeEntries(...args);
export const createKnowledgeEntry = async (...args: Parameters<typeof jsonl.createKnowledgeEntry>) => impl().createKnowledgeEntry(...args);
export const getOrCreateCustomerFromRequest = async (...args: Parameters<typeof jsonl.getOrCreateCustomerFromRequest>) => impl().getOrCreateCustomerFromRequest(...args);
