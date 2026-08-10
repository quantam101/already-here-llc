import { createHash } from 'node:crypto';
import { findRecordBy, listRecords, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface IdentityInput {
  organizationName?: string;
  organizationType?: 'client' | 'vendor' | 'partner' | 'prospect' | 'technician_company' | 'internal';
  fullName?: string;
  email?: string;
  phone?: string;
  roleTitle?: string;
  source: string;
  consentStatus?: 'unknown' | 'opted_in' | 'opted_out' | 'contractual';
  serviceArea?: string;
  observedAt?: string;
}

export interface IdentityResult {
  ok: boolean;
  organizationId?: string;
  contactId?: string;
  organizationCreated: boolean;
  contactCreated: boolean;
  matchedBy: string[];
  errors: string[];
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

export function normalizeEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

export function normalizePhone(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

export function normalizeOrganizationName(name?: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\b(llc|inc|incorporated|corp|corporation|co|company|ltd)\.?\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function findOrganization(normalizedName: string): Record<string, unknown> | undefined {
  if (!normalizedName) return undefined;
  const direct = findRecordBy('organizations', 'normalized_name', normalizedName);
  if (direct) return direct;
  return listRecords('organizations', 5000).find((record) => normalizeOrganizationName(String(record.name || record.legal_name || '')) === normalizedName);
}

function findContact(normalizedEmail: string, normalizedPhone: string): { record?: Record<string, unknown>; matchedBy?: string } {
  if (normalizedEmail) {
    const direct = findRecordBy('contacts', 'normalized_email', normalizedEmail)
      || listRecords('contacts', 5000).find((record) => normalizeEmail(String(record.email || '')) === normalizedEmail);
    if (direct) return { record: direct, matchedBy: 'email' };
  }
  if (normalizedPhone) {
    const direct = findRecordBy('contacts', 'normalized_phone', normalizedPhone)
      || listRecords('contacts', 5000).find((record) => normalizePhone(String(record.phone || '')) === normalizedPhone);
    if (direct) return { record: direct, matchedBy: 'phone' };
  }
  return {};
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

export async function resolveCanonicalIdentity(input: IdentityInput): Promise<IdentityResult> {
  const now = input.observedAt || new Date().toISOString();
  const normalizedName = normalizeOrganizationName(input.organizationName);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const matchedBy: string[] = [];
  const writes: DatabaseReadyWrite[] = [];

  let organization = findOrganization(normalizedName);
  let organizationCreated = false;
  if (organization) matchedBy.push('organization_name');

  let organizationId = organization ? String(organization.id) : undefined;
  if (!organization && normalizedName) {
    organizationId = stableId('org', normalizedName);
    organizationCreated = true;
    organization = {
      id: organizationId,
      name: input.organizationName?.trim() || normalizedName,
      normalized_name: normalizedName,
      organization_type: input.organizationType || 'prospect',
      source: input.source,
      source_history: [input.source],
      service_area: input.serviceArea || null,
      created_at: now,
      updated_at: now
    };
    writes.push({ table: 'organizations', id: organizationId, action: 'insert', record: organization });
  } else if (organization && organizationId) {
    const updatedOrganization = {
      ...organization,
      normalized_name: normalizedName || organization.normalized_name,
      organization_type: input.organizationType || organization.organization_type,
      source_history: uniqueStrings([...(Array.isArray(organization.source_history) ? organization.source_history : []), organization.source, input.source]),
      service_area: input.serviceArea || organization.service_area || null,
      updated_at: now
    };
    writes.push({ table: 'organizations', id: organizationId, action: 'insert', record: updatedOrganization });
  }

  const contactMatch = findContact(normalizedEmail, normalizedPhone);
  let contact = contactMatch.record;
  let contactCreated = false;
  if (contactMatch.matchedBy) matchedBy.push(contactMatch.matchedBy);
  let contactId = contact ? String(contact.id) : undefined;

  if (!contact && (normalizedEmail || normalizedPhone || input.fullName)) {
    const identityKey = normalizedEmail || normalizedPhone || `${organizationId || 'none'}:${(input.fullName || '').trim().toLowerCase()}`;
    contactId = stableId('contact', identityKey);
    contactCreated = true;
    contact = {
      id: contactId,
      organization_id: organizationId || null,
      full_name: input.fullName?.trim() || null,
      email: input.email?.trim() || null,
      normalized_email: normalizedEmail || null,
      phone: input.phone?.trim() || null,
      normalized_phone: normalizedPhone || null,
      role_title: input.roleTitle?.trim() || null,
      source: input.source,
      source_history: [input.source],
      consent_status: input.consentStatus || 'unknown',
      created_at: now,
      updated_at: now
    };
    writes.push({ table: 'contacts', id: contactId, action: 'insert', record: contact });
  } else if (contact && contactId) {
    const updatedContact = {
      ...contact,
      organization_id: organizationId || contact.organization_id || null,
      full_name: input.fullName?.trim() || contact.full_name || null,
      email: input.email?.trim() || contact.email || null,
      normalized_email: normalizedEmail || contact.normalized_email || null,
      phone: input.phone?.trim() || contact.phone || null,
      normalized_phone: normalizedPhone || contact.normalized_phone || null,
      role_title: input.roleTitle?.trim() || contact.role_title || null,
      source_history: uniqueStrings([...(Array.isArray(contact.source_history) ? contact.source_history : []), contact.source, input.source]),
      consent_status: input.consentStatus || contact.consent_status || 'unknown',
      updated_at: now
    };
    writes.push({ table: 'contacts', id: contactId, action: 'insert', record: updatedContact });
  }

  if (!writes.length) {
    return { ok: true, organizationId, contactId, organizationCreated, contactCreated, matchedBy, errors: [] };
  }

  const auditTarget = contactId || organizationId || stableId('identity', `${input.source}:${now}`);
  writes.push({
    table: 'audit_logs',
    id: stableId('audit', `identity:${auditTarget}:${now}`),
    action: 'insert',
    record: {
      id: stableId('audit', `identity:${auditTarget}:${now}`),
      actor: 'canonical_identity_resolver',
      action: 'resolve_identity',
      target_table: contactId ? 'contacts' : 'organizations',
      target_id: auditTarget,
      risk_level: 'medium',
      allowed: 1,
      reason: `Resolved identity from source ${input.source}; matched by ${matchedBy.join(', ') || 'new record'}.`,
      created_at: now,
      updated_at: now
    }
  });

  const result = await persistDatabaseReadyWrites(writes);
  return {
    ok: result.errors.length === 0,
    organizationId,
    contactId,
    organizationCreated,
    contactCreated,
    matchedBy,
    errors: result.errors
  };
}
