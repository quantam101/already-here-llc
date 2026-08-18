import { normalizeEmail } from './canonical-ids';
import { buildFollowUpRecord } from './followups';
import type { DatabaseReadyWrite } from './canonical-store';
import type { ParsedDSN } from './dsn-parser';

export interface BounceInput {
  email: string;
  dsn?: string;
  parsed: ParsedDSN;
  source: string;
  sourceId?: string;
  outreachId?: string;
  submittedAt?: string;
}

export async function buildBounceSuppressionWrites(input: BounceInput, store: {
  getRecord: (table: string, id: string) => Promise<Record<string, unknown> | undefined>;
  queryTable: (table: string, limit: number) => Promise<Record<string, unknown>[]>;
}): Promise<DatabaseReadyWrite[]> {
  const now = input.submittedAt ?? new Date().toISOString();
  const email = normalizeEmail(input.email);
  const bounceId = `bounce_${Date.now()}_${email ? email.replace(/[^a-z0-9]/g, '_') : 'unknown'}`;

  // Find contact by normalized email
  const allContacts = await store.queryTable('contacts', 5000);
  const contact = allContacts.find((c) => normalizeEmail(String(c.email || '')) === email) as Record<string, unknown> | undefined;

  if (!contact) {
    // Still record the bounce so it can be reconciled later
    return [{
      table: 'bounces',
      id: bounceId,
      action: 'insert',
      record: {
        id: bounceId,
        email,
        status_code: input.parsed.statusCode,
        bounce_type: input.parsed.bounceType,
        diagnostic: input.parsed.diagnostic,
        remote_mta: input.parsed.remoteMta,
        dsn_raw: input.dsn ?? null,
        source: input.source,
        source_id: input.sourceId ?? null,
        resolved: false,
        created_at: now,
        updated_at: now,
      },
    }];
  }

  const contactId = String(contact.id);
  const orgId = String(contact.organization_id);
  const bounceCount = (Number(contact.bounce_count) || 0) + 1;
  const suppressed = input.parsed.bounceType === 'hard' || bounceCount >= 2;

  const contactWrite: DatabaseReadyWrite = {
    table: 'contacts',
    id: contactId,
    action: 'upsert',
    record: {
      id: contactId,
      email_status: suppressed ? 'bounced' : 'soft_bounce',
      suppressed,
      bounce_count: bounceCount,
      last_bounce_at: now,
      updated_at: now,
    },
  };

  // Find replacement contacts in same org that are not suppressed and have a different email
  const replacementCandidates = allContacts.filter((c) =>
    c.organization_id === orgId &&
    normalizeEmail(String(c.email || '')) !== email &&
    !c.suppressed &&
    c.email
  );

  const replacement = replacementCandidates[0] as Record<string, unknown> | undefined;

  const bounceRecord = {
    id: bounceId,
    contact_id: contactId,
    organization_id: orgId,
    email,
    status_code: input.parsed.statusCode,
    bounce_type: input.parsed.bounceType,
    diagnostic: input.parsed.diagnostic,
    remote_mta: input.parsed.remoteMta,
    dsn_raw: input.dsn ?? null,
    replacement_contact_id: replacement ? String(replacement.id) : null,
    approved_for_resend: false,
    source: input.source,
    source_id: input.sourceId ?? null,
    resolved: false,
    created_at: now,
    updated_at: now,
  };

  const followUp = replacement
    ? buildFollowUpRecord({
        source: input.source,
        sourceId: input.sourceId,
        organizationId: orgId,
        contactId: replacement ? String(replacement.id) : contactId,
        relatedRecordType: 'bounce',
        relatedRecordId: bounceId,
        lane: 'outreach',
        purpose: `Bounced email ${email} for ${contact.full_name || 'contact'} — approve resend to ${replacement.full_name} <${replacement.email}>`,
        channel: 'email',
        offer: 'bounce_replacement',
        dueAt: now,
        status: 'open',
        createdAt: now,
      })
    : buildFollowUpRecord({
        source: input.source,
        sourceId: input.sourceId,
        organizationId: orgId,
        contactId,
        relatedRecordType: 'bounce',
        relatedRecordId: bounceId,
        lane: 'outreach',
        purpose: `Bounced email ${email} for ${contact.full_name || 'contact'} — no replacement contact found; research required`,
        channel: 'email',
        offer: 'bounce_replacement',
        dueAt: now,
        status: 'open',
        createdAt: now,
      });

  const writes: DatabaseReadyWrite[] = [
    contactWrite,
    { table: 'bounces', id: bounceId, action: 'insert', record: bounceRecord },
    followUp,
  ];

  // Also mark the outreach record as bounced if provided or found
  let outreachId = input.outreachId;
  if (!outreachId) {
    const outreaches = await store.queryTable('outreach', 1000);
    const matched = outreaches.find((o) =>
      normalizeEmail(String(o.email || '')) === email &&
      o.organization_id === orgId
    ) as Record<string, unknown> | undefined;
    if (matched) outreachId = String(matched.id);
  }

  if (outreachId) {
    writes.push({
      table: 'outreach',
      id: outreachId,
      action: 'upsert',
      record: {
        id: outreachId,
        status: 'lost',
        bounce_id: bounceId,
        email_status: suppressed ? 'bounced' : 'soft_bounce',
        updated_at: now,
      },
    });
  }

  return writes;
}
