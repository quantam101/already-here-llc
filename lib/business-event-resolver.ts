import { canonicalId, canonicalSlug, normalizeDomain, normalizeEmail, normalizePhone } from './canonical-ids';
import { getCanonicalStore } from './canonical-store';
import { safeCanonicalUpsert } from './canonical-upsert';

export type BusinessEventType =
  | 'new_opportunity'
  | 'existing_engagement'
  | 'job_created'
  | 'schedule_changed'
  | 'status_changed'
  | 'duplicate_notification'
  | 'partner_communication'
  | 'closeout'
  | 'payment'
  | 'delivery_delayed'
  | 'hard_bounce'
  | 'delivered'
  | 'unknown';

export interface BusinessSignalInput {
  source: string;
  sourceMessageId?: string;
  externalId?: string;
  subject?: string;
  body?: string;
  organizationName?: string;
  organizationDomain?: string;
  website?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  eventType?: BusinessEventType;
  occurredAt?: string;
  status?: string;
  scheduledAt?: string;
  amountCents?: number;
  metadata?: Record<string, unknown>;
}

export interface ResolvedBusinessSignal {
  organizationId?: string;
  contactId?: string;
  communicationId: string;
  eventId: string;
  eventType: BusinessEventType;
  duplicate: boolean;
  targetTable?: string;
  targetId?: string;
}

function inferEventType(input: BusinessSignalInput): BusinessEventType {
  if (input.eventType) return input.eventType;
  const text = `${input.subject ?? ''} ${input.body ?? ''}`.toLowerCase();
  if (/hard bounce|undeliverable|delivery failed|mailbox unavailable|recipient address rejected/.test(text)) return 'hard_bounce';
  if (/delayed|will retry|temporary delivery/.test(text)) return 'delivery_delayed';
  if (/delivered|delivery successful/.test(text)) return 'delivered';
  if (/rescheduled|schedule changed|new date|new time/.test(text)) return 'schedule_changed';
  if (/on site|off site|status changed|completed|closed/.test(text)) return 'status_changed';
  if (/payment|paid|remittance|deposit/.test(text)) return 'payment';
  if (/closeout|proof of work|service report/.test(text)) return 'closeout';
  if (/work order|ticket|assignment|dispatch/.test(text) && input.externalId) return 'job_created';
  if (/opportunity|project|proposal|quote|availability|interested/.test(text)) return 'new_opportunity';
  if (/partner|onboarding|w-9|coi|vendor|provider/.test(text)) return 'partner_communication';
  return 'unknown';
}

async function resolveOrganization(input: BusinessSignalInput): Promise<string | undefined> {
  const store = getCanonicalStore();
  const domain = normalizeDomain(input.organizationDomain, input.website, input.email);
  const name = input.organizationName?.trim();
  const orgs = await store.queryTable('organizations', 5000);
  const existing = orgs.find((record) =>
    (domain && normalizeDomain(record.domain, record.website, undefined) === domain) ||
    (name && canonicalSlug(String(record.name ?? '')) === canonicalSlug(name))
  );
  const id = String(existing?.id ?? canonicalId('org', domain || canonicalSlug(name || 'unknown')));
  if (!name && !domain && !existing) return undefined;
  await safeCanonicalUpsert('organizations', id, {
    name: name ?? existing?.name ?? domain,
    domain: domain || existing?.domain || null,
    website: input.website ?? null,
    aliases: name ? [name] : [],
    source: input.source,
  });
  return id;
}

async function resolveContact(input: BusinessSignalInput, organizationId?: string): Promise<string | undefined> {
  const store = getCanonicalStore();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const contacts = await store.queryTable('contacts', 5000);
  const existing = contacts.find((record) =>
    (email && normalizeEmail(record.email) === email) ||
    (phone && normalizePhone(record.phone) === phone)
  );
  if (!email && !phone && !input.contactName && !existing) return undefined;
  const id = String(existing?.id ?? canonicalId('contact', organizationId ?? 'none', email || phone || canonicalSlug(input.contactName || 'unknown')));
  await safeCanonicalUpsert('contacts', id, {
    organization_id: organizationId ?? existing?.organization_id ?? null,
    name: input.contactName ?? existing?.name ?? null,
    email: email || existing?.email || null,
    phone: phone || existing?.phone || null,
    source: input.source,
  });
  return id;
}

async function findTargetByExternalId(externalId?: string): Promise<{ table: string; id: string } | undefined> {
  if (!externalId) return undefined;
  const store = getCanonicalStore();
  for (const table of ['jobs', 'engagements', 'opportunities']) {
    const records = await store.queryTable(table, 5000);
    const match = records.find((record) => String(record.external_id ?? record.ticket_id ?? record.work_order_id ?? '') === externalId);
    if (match?.id) return { table, id: String(match.id) };
  }
  return undefined;
}

export async function resolveBusinessSignal(input: BusinessSignalInput): Promise<ResolvedBusinessSignal> {
  const eventType = inferEventType(input);
  const organizationId = await resolveOrganization(input);
  const contactId = await resolveContact(input, organizationId);
  const existingTarget = await findTargetByExternalId(input.externalId);
  const sourceIdentity = input.sourceMessageId || input.externalId || `${input.subject ?? ''}:${input.occurredAt ?? ''}`;
  const communicationId = canonicalId('comm', input.source, sourceIdentity);
  const store = getCanonicalStore();
  const existingCommunication = await store.getRecord('communications', communicationId);

  await safeCanonicalUpsert('communications', communicationId, {
    organization_id: organizationId ?? null,
    contact_id: contactId ?? null,
    source_message_id: input.sourceMessageId ?? null,
    external_id: input.externalId ?? null,
    subject: input.subject ?? null,
    body_excerpt: (input.body ?? '').slice(0, 1000),
    event_type: eventType,
    status: input.status ?? null,
    scheduled_at: input.scheduledAt ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    metadata_json: JSON.stringify(input.metadata ?? {}),
    source: input.source,
  });

  const eventId = canonicalId('event', input.source, input.externalId || input.sourceMessageId || communicationId, eventType, input.scheduledAt || input.status || '');
  await safeCanonicalUpsert('business_events', eventId, {
    organization_id: organizationId ?? null,
    contact_id: contactId ?? null,
    communication_id: communicationId,
    target_table: existingTarget?.table ?? null,
    target_id: existingTarget?.id ?? null,
    external_id: input.externalId ?? null,
    event_type: existingCommunication ? 'duplicate_notification' : eventType,
    original_event_type: eventType,
    status: input.status ?? null,
    scheduled_at: input.scheduledAt ?? null,
    amount_cents: input.amountCents ?? 0,
    source: input.source,
  });

  if (contactId && ['hard_bounce', 'delivery_delayed', 'delivered'].includes(eventType)) {
    const contact = await store.getRecord('contacts', contactId);
    const currentBounces = Number(contact?.bounce_count ?? 0);
    await safeCanonicalUpsert('contacts', contactId, {
      email_status: eventType === 'hard_bounce' ? 'hard_bounce' : eventType === 'delivery_delayed' ? 'delayed' : 'deliverable',
      suppressed: eventType === 'hard_bounce',
      bounce_count: eventType === 'hard_bounce' ? currentBounces + 1 : currentBounces,
      last_delivery_event_at: input.occurredAt ?? new Date().toISOString(),
    });
  }

  return {
    organizationId,
    contactId,
    communicationId,
    eventId,
    eventType: existingCommunication ? 'duplicate_notification' : eventType,
    duplicate: Boolean(existingCommunication),
    targetTable: existingTarget?.table,
    targetId: existingTarget?.id,
  };
}
