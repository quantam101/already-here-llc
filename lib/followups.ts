import { canonicalId } from './canonical-ids';
import type { DatabaseReadyWrite } from './canonical-store';

export type FollowUpStatus = 'open' | 'in_progress' | 'waiting' | 'closed' | 'no_response' | 'do_not_contact';

export interface FollowUpInput {
  source: string;
  sourceId?: string;
  organizationId: string;
  contactId?: string;
  relatedRecordType?: 'opportunity' | 'job' | 'technician' | 'applicant' | 'work_order' | 'contact' | 'revenue' | 'autoworks' | string;
  relatedRecordId?: string;
  lane?: string;
  purpose: string;
  assignedTo?: string;
  dueAt?: string;
  channel?: 'email' | 'phone' | 'sms' | 'web' | 'in_person' | 'voice' | 'photo' | 'social' | 'vendor' | 'other' | 'unknown';
  offer?: string;
  notes?: string;
  status?: FollowUpStatus;
  createdAt?: string;
}

export interface FollowUpRecord {
  id: string;
  source: string;
  source_id: string | null;
  organization_id: string;
  contact_id: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
  lane: string;
  purpose: string;
  assigned_to: string | null;
  due_at: string | null;
  channel: string;
  offer: string | null;
  notes: string | null;
  status: FollowUpStatus;
  created_at: string;
  updated_at: string;
}

export function buildFollowUpRecord(input: FollowUpInput): DatabaseReadyWrite {
  const now = input.createdAt ?? new Date().toISOString();
  const id = canonicalId('followup', input.organizationId, input.relatedRecordId ?? input.purpose, now);

  const dueAt = input.dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const record: FollowUpRecord = {
    id,
    source: input.source,
    source_id: input.sourceId ?? null,
    organization_id: input.organizationId,
    contact_id: input.contactId ?? null,
    related_record_type: input.relatedRecordType ?? null,
    related_record_id: input.relatedRecordId ?? null,
    lane: input.lane ?? 'general',
    purpose: input.purpose.trim(),
    assigned_to: input.assignedTo ?? null,
    due_at: dueAt,
    channel: input.channel ?? 'email',
    offer: input.offer ?? null,
    notes: (input.notes ?? '').trim() || null,
    status: input.status ?? 'open',
    created_at: now,
    updated_at: now
  };

  return { table: 'followups', id, action: 'insert', record: record as unknown as Record<string, unknown> };
}

export function defaultFollowUpDueAt(hoursFromNow = 24): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}
