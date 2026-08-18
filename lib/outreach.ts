import { canonicalId, canonicalSlug, normalizeEmail, normalizePhone } from './canonical-ids';
import { buildFollowUpRecord } from './followups';
import type { DatabaseReadyWrite } from './canonical-store';

export type OutreachStatus = 'draft' | 'ready' | 'sent' | 'responded' | 'meeting' | 'proposal' | 'won' | 'lost' | 'no_response' | 'do_not_contact' | 'bounced';
export type OutreachChannel = 'email' | 'phone' | 'social' | 'sms' | 'in_person' | 'vendor' | 'other';

export interface OutreachInput {
  source: string;
  sourceId?: string;
  channel: OutreachChannel;
  fullName: string;
  company: string;
  email?: string;
  phone?: string;
  domain?: string;
  messageType: string;
  offer: string;
  messageBody?: string;
  response?: string;
  status?: OutreachStatus;
  nextAction?: string;
  nextFollowUpDate?: string;
  assignedTo?: string;
  submittedAt?: string;
}

export interface OutreachRecord {
  id: string;
  organization_id: string;
  contact_id: string;
  source: string;
  source_id: string | null;
  channel: string;
  full_name: string;
  company: string;
  email: string | null;
  phone: string | null;
  domain: string | null;
  message_type: string;
  offer: string;
  message_body: string | null;
  response: string | null;
  status: OutreachStatus;
  next_action: string | null;
  next_follow_up_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export function buildOutreachRecords(input: OutreachInput): DatabaseReadyWrite[] {
  const now = input.submittedAt ?? new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedDomain = input.domain?.trim().toLowerCase() || '';
  const orgKey = canonicalSlug(input.company);
  const orgId = canonicalId('org', orgKey);
  const contactKey = normalizedEmail || normalizedPhone || canonicalSlug(input.fullName);
  const contactId = canonicalId('contact', orgId, contactKey);
  const outreachId = canonicalId('outreach', input.source, contactId, now);

  const orgRecord: Record<string, unknown> = {
    id: orgId,
    name: input.company.trim(),
    organization_type: 'prospect',
    source: input.source,
    source_id: input.sourceId ?? null,
    domain: normalizedDomain || null,
    aliases: [input.company, normalizedDomain].filter(Boolean),
    created_at: now,
    updated_at: now
  };

  const contactRecord: Record<string, unknown> = {
    id: contactId,
    organization_id: orgId,
    full_name: input.fullName.trim(),
    email: normalizedEmail || null,
    phone: normalizedPhone || null,
    source: input.source,
    source_id: input.sourceId ?? null,
    channel: input.channel,
    role: 'outreach_target',
    aliases: [input.fullName, normalizedEmail, normalizedPhone].filter(Boolean),
    email_status: 'unverified',
    suppressed: false,
    bounce_count: 0,
    created_at: now,
    updated_at: now
  };

  const outreach: OutreachRecord = {
    id: outreachId,
    organization_id: orgId,
    contact_id: contactId,
    source: input.source,
    source_id: input.sourceId ?? null,
    channel: input.channel,
    full_name: input.fullName.trim(),
    company: input.company.trim(),
    email: normalizedEmail || null,
    phone: normalizedPhone || null,
    domain: normalizedDomain || null,
    message_type: input.messageType.trim(),
    offer: input.offer.trim(),
    message_body: (input.messageBody ?? '').trim() || null,
    response: (input.response ?? '').trim() || null,
    status: input.status ?? 'draft',
    next_action: (input.nextAction ?? '').trim() || null,
    next_follow_up_date: input.nextFollowUpDate?.trim() || null,
    assigned_to: input.assignedTo ?? null,
    created_at: now,
    updated_at: now
  };

  const followUp = buildFollowUpRecord({
    source: input.source,
    sourceId: input.sourceId,
    organizationId: orgId,
    contactId,
    relatedRecordType: 'outreach',
    relatedRecordId: outreachId,
    lane: 'outreach',
    purpose: `Outreach follow-up: ${input.offer} — ${input.fullName} (${input.company})`,
    channel: input.channel,
    offer: input.offer,
    dueAt: input.nextFollowUpDate,
    status: input.status === 'do_not_contact' ? 'closed' : 'open',
    createdAt: now
  });

  return [
    { table: 'organizations', id: orgId, action: 'insert', record: orgRecord },
    { table: 'contacts', id: contactId, action: 'insert', record: contactRecord },
    { table: 'outreach', id: outreachId, action: 'insert', record: outreach as unknown as Record<string, unknown> },
    followUp
  ];
}
