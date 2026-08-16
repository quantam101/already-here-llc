import { canonicalId, canonicalSlug, normalizeEmail, normalizePhone } from './canonical-ids';
import type { DatabaseReadyWrite } from './canonical-store';

export const REFERRAL_REWARD_CENTS = 2500;
export const PARTNER_COMMISSION_BASIS_POINTS = 1000; // 10%

export type PartnerType = 'msp' | 'vendor' | 'integrator' | 'prime_contractor' | 'retail' | 'referrer' | 'other';
export type PartnerStatus = 'pending' | 'approved' | 'declined';
export type ReferralOwnerType = 'partner' | 'user';
export type ReferralEventType = 'checkout' | 'paid_week' | 'signup' | 'lead';
export type ReferralConversionStatus = 'pending' | 'paid' | 'cancelled';

export interface PartnerRecord {
  id: string;
  name: string;
  company: string;
  type: PartnerType;
  status: PartnerStatus;
  contact_email: string;
  contact_name: string;
  phone: string | null;
  website: string | null;
  referral_code: string;
  commission_basis_points: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralCodeRecord {
  id: string;
  code: string;
  owner_type: ReferralOwnerType;
  owner_id: string;
  reward_cents: number;
  conversions_count: number;
  total_revenue_cents: number;
  total_rewards_cents: number;
  status: 'active' | 'paused' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface ReferralConversionRecord {
  id: string;
  referral_code: string;
  partner_id: string | null;
  referred_email: string | null;
  referred_name: string | null;
  event_type: ReferralEventType;
  source_table: string;
  source_id: string;
  revenue_cents: number;
  reward_cents: number;
  status: ReferralConversionStatus;
  created_at: string;
  updated_at: string;
}

export interface PartnerInput {
  name: string;
  company: string;
  type: PartnerType | string;
  contactEmail: string;
  contactName?: string;
  phone?: string;
  website?: string;
  notes?: string;
  code?: string;
  rewardCents?: number;
  commissionBasisPoints?: number;
  status?: PartnerStatus;
  submittedAt?: string;
}

export interface UserReferralInput {
  email: string;
  name?: string;
  code?: string;
  rewardCents?: number;
}

export interface ReferralConversionInput {
  code: string;
  referredEmail?: string;
  referredName?: string;
  eventType: ReferralEventType | string;
  sourceTable: string;
  sourceId: string;
  dedupeKey?: string;
  revenueCents?: number;
  rewardCents?: number;
  partnerId?: string | null;
  status?: ReferralConversionStatus;
  createdAt?: string;
}

export interface ReferralStats {
  code: string;
  link: string;
  conversions: number;
  totalRevenueCents: number;
  totalRewardsCents: number;
}

export function isValidReferralCode(code: string): boolean {
  return /^AH-[A-Z0-9]{6}$/.test((code || '').trim());
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'AH-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class ReferralCodeConflictError extends Error {
  constructor(message = 'Referral code is already in use by another account.') {
    super(message);
    this.name = 'ReferralCodeConflictError';
  }
}

export async function generateUniqueReferralCode(
  store: { getRecord: (table: string, id: string) => Promise<Record<string, unknown> | undefined> },
  maxAttempts = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateReferralCode();
    const existing = await store.getRecord('referral_codes', referralCodeId(code));
    if (!existing) return code;
  }
  throw new Error('Unable to generate a unique referral code');
}

export async function isReferralCodeAvailable(
  store: { getRecord: (table: string, id: string) => Promise<Record<string, unknown> | undefined> },
  code: string,
  ownerId?: string
): Promise<{ available: boolean; existing?: ReferralCodeRecord }> {
  const existing = await getReferralCodeByCode(store, code);
  if (!existing) return { available: true };
  if (ownerId && existing.owner_id === ownerId && existing.owner_type === 'user') {
    return { available: true, existing };
  }
  return { available: false, existing };
}

export function buildReferralLink(code: string, baseUrl = 'https://www.alreadyherellc.com'): string {
  const url = new URL(baseUrl);
  url.searchParams.set('ref', code);
  return url.toString();
}

export function normalizePartnerType(value: string): PartnerType {
  const t = (value || 'other').toLowerCase().replace(/[-\s]+/g, '_');
  if (t.includes('1099')) return 'other';
  if (t.includes('prime')) return 'prime_contractor';
  if (t.includes('msp')) return 'msp';
  if (t.includes('vendor')) return 'vendor';
  if (t.includes('integrator')) return 'integrator';
  if (t.includes('contractor')) return 'other';
  if (t.includes('retail') || t.includes('restaurant')) return 'retail';
  if (t.includes('referrer') || t.includes('referral') || t.includes('affiliate')) return 'referrer';
  return 'other';
}

function parsePartnerType(value: PartnerType | string): PartnerType {
  if (typeof value === 'string') return normalizePartnerType(value);
  return value;
}

export function referralCodeId(code: string): string {
  return canonicalId('refcode', code.toUpperCase());
}

export function partnerId(email: string): string {
  return canonicalId('partner', normalizeEmail(email));
}

export function conversionId(code: string, sourceId: string): string {
  return canonicalId('conversion', code.toUpperCase(), sourceId);
}

export function buildReferralCodeWrite(input: {
  code: string;
  ownerType: ReferralOwnerType;
  ownerId: string;
  rewardCents?: number;
  status?: 'active' | 'paused' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
}): DatabaseReadyWrite {
  const now = input.createdAt ?? new Date().toISOString();
  const record: ReferralCodeRecord = {
    id: referralCodeId(input.code),
    code: input.code.toUpperCase(),
    owner_type: input.ownerType,
    owner_id: input.ownerId,
    reward_cents: input.rewardCents ?? REFERRAL_REWARD_CENTS,
    conversions_count: 0,
    total_revenue_cents: 0,
    total_rewards_cents: 0,
    status: input.status ?? 'active',
    created_at: now,
    updated_at: input.updatedAt ?? now
  };
  return { table: 'referral_codes', id: record.id, action: 'insert', record: record as unknown as Record<string, unknown> };
}

export function buildPartnerRecord(input: PartnerInput): PartnerRecord {
  const now = input.submittedAt ?? new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.contactEmail);
  const code = (input.code || generateReferralCode()).toUpperCase();
  return {
    id: partnerId(normalizedEmail),
    name: input.name.trim(),
    company: input.company.trim() || input.name.trim(),
    type: parsePartnerType(input.type),
    status: input.status ?? 'pending',
    contact_email: normalizedEmail,
    contact_name: (input.contactName ?? input.name).trim(),
    phone: normalizePhone(input.phone) || null,
    website: canonicalSlug(input.website || '') ? input.website!.trim() : null,
    referral_code: code,
    commission_basis_points: input.commissionBasisPoints ?? PARTNER_COMMISSION_BASIS_POINTS,
    notes: (input.notes || '').trim() || null,
    created_at: now,
    updated_at: now
  };
}

export function buildPartnerWrites(input: PartnerInput): DatabaseReadyWrite[] {
  const partner = buildPartnerRecord(input);
  const codeWrite = buildReferralCodeWrite({
    code: partner.referral_code,
    ownerType: 'partner',
    ownerId: partner.id,
    rewardCents: input.rewardCents ?? REFERRAL_REWARD_CENTS,
    createdAt: partner.created_at
  });
  return [
    { table: 'partners', id: partner.id, action: 'insert', record: partner as unknown as Record<string, unknown> },
    codeWrite
  ];
}

export function buildUserReferralWrites(input: UserReferralInput): DatabaseReadyWrite[] {
  const normalizedEmail = normalizeEmail(input.email);
  const ownerId = canonicalId('user', normalizedEmail);
  const code = (input.code || generateReferralCode()).toUpperCase();
  const now = new Date().toISOString();
  return [buildReferralCodeWrite({
    code,
    ownerType: 'user',
    ownerId,
    rewardCents: input.rewardCents ?? REFERRAL_REWARD_CENTS,
    createdAt: now,
    updatedAt: now
  })];
}

export function buildReferralConversionRecord(input: ReferralConversionInput, codeRecord?: ReferralCodeRecord | null): ReferralConversionRecord {
  const now = input.createdAt ?? new Date().toISOString();
  const revenue = Math.max(0, input.revenueCents ?? 0);
  const reward = input.rewardCents ?? (codeRecord?.reward_cents ?? REFERRAL_REWARD_CENTS);
  return {
    id: conversionId(input.code, input.dedupeKey ?? input.sourceId),
    referral_code: input.code.toUpperCase(),
    partner_id: input.partnerId ?? (codeRecord?.owner_type === 'partner' ? codeRecord.owner_id : null),
    referred_email: input.referredEmail ? normalizeEmail(input.referredEmail) : null,
    referred_name: input.referredName ? input.referredName.trim() : null,
    event_type: input.eventType as ReferralEventType,
    source_table: input.sourceTable,
    source_id: input.sourceId,
    revenue_cents: revenue,
    reward_cents: reward,
    status: input.status ?? 'pending',
    created_at: now,
    updated_at: now
  };
}

export function buildReferralConversionWrite(input: ReferralConversionInput, codeRecord?: ReferralCodeRecord | null): DatabaseReadyWrite {
  const record = buildReferralConversionRecord(input, codeRecord);
  return { table: 'referral_conversions', id: record.id, action: 'insert', record: record as unknown as Record<string, unknown> };
}

export function buildReferralCodeUpdate(
  existing: ReferralCodeRecord,
  revenueCents: number,
  rewardCents: number
): DatabaseReadyWrite {
  const now = new Date().toISOString();
  const updated: ReferralCodeRecord = {
    ...existing,
    conversions_count: (existing.conversions_count || 0) + 1,
    total_revenue_cents: (existing.total_revenue_cents || 0) + revenueCents,
    total_rewards_cents: (existing.total_rewards_cents || 0) + rewardCents,
    updated_at: now
  };
  return { table: 'referral_codes', id: updated.id, action: 'insert', record: updated as unknown as Record<string, unknown> };
}

export async function getReferralCodeByCode(
  store: { getRecord: (table: string, id: string) => Promise<Record<string, unknown> | undefined> },
  code: string
): Promise<ReferralCodeRecord | undefined> {
  const record = await store.getRecord('referral_codes', referralCodeId(code));
  return record ? (record as unknown as ReferralCodeRecord) : undefined;
}

const REFERRAL_QUERY_LIMIT = 100_000;

export async function getReferralCodesForOwner(
  store: { queryTable: (table: string, limit?: number) => Promise<Record<string, unknown>[]> },
  ownerType: ReferralOwnerType,
  ownerId: string
): Promise<ReferralCodeRecord[]> {
  const records = await store.queryTable('referral_codes', REFERRAL_QUERY_LIMIT);
  return records
    .filter((r) => r.owner_type === ownerType && r.owner_id === ownerId)
    .map((r) => r as unknown as ReferralCodeRecord);
}

export async function getOrCreateUserReferralCode(
  store: {
    getRecord: (table: string, id: string) => Promise<Record<string, unknown> | undefined>;
    queryTable: (table: string, limit?: number) => Promise<Record<string, unknown>[]>;
    executeWrites: (writes: DatabaseReadyWrite[]) => Promise<{ ok: boolean; insertedIds: string[]; failed: Array<{ table: string; id: string; error: string }> }>;
  },
  input: UserReferralInput
): Promise<{ code: ReferralCodeRecord; created: boolean }> {
  const normalizedEmail = normalizeEmail(input.email);
  const ownerId = canonicalId('user', normalizedEmail);

  const byOwner = await getReferralCodesForOwner(store, 'user', ownerId);
  if (byOwner.length > 0) {
    return { code: byOwner[0], created: false };
  }

  const code = input.code ? input.code.toUpperCase() : await generateUniqueReferralCode(store);
  const availability = await isReferralCodeAvailable(store, code, ownerId);
  if (!availability.available) {
    if (input.code && availability.existing?.owner_id === ownerId) {
      return { code: availability.existing, created: false };
    }
    throw new ReferralCodeConflictError();
  }

  const writes = buildUserReferralWrites({ ...input, code });
  await store.executeWrites(writes);
  const record = await getReferralCodeByCode(store, code);
  return { code: record!, created: true };
}

export async function getReferralStats(
  store: { getRecord: (table: string, id: string) => Promise<Record<string, unknown> | undefined> },
  code: string,
  baseUrl?: string
): Promise<ReferralStats> {
  const record = await getReferralCodeByCode(store, code);
  return {
    code: code.toUpperCase(),
    link: buildReferralLink(code, baseUrl),
    conversions: typeof record?.conversions_count === 'number' ? record.conversions_count : 0,
    totalRevenueCents: typeof record?.total_revenue_cents === 'number' ? record.total_revenue_cents : 0,
    totalRewardsCents: typeof record?.total_rewards_cents === 'number' ? record.total_rewards_cents : 0
  };
}

export function computePartnerCommission(revenueCents: number, basisPoints: number): number {
  return Math.max(0, Math.round(revenueCents * (basisPoints / 10000)));
}

export function referralBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || 'https://www.alreadyherellc.com';
}
