import { createHash } from 'node:crypto';
import { findRecordBy, getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import { resolveCanonicalIdentity } from './revenue-command-identity';
import type { DatabaseReadyWrite } from './revenue-command-intake';

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

export interface ReconcileLeadResult {
  ok: boolean;
  leadId: string;
  opportunityId?: string;
  canonicalOrganizationId?: string;
  canonicalContactId?: string;
  updatedRecordIds: string[];
  errors: string[];
}

export async function reconcileLeadIdentity(leadId: string, actor = 'identity_reconciler'): Promise<ReconcileLeadResult> {
  const lead = getRecord('leads', leadId);
  if (!lead) {
    return { ok: false, leadId, updatedRecordIds: [], errors: [`Lead not found: ${leadId}`] };
  }

  const legacyContactId = String(lead.contact_id || '');
  const legacyOrganizationId = String(lead.organization_id || '');
  const contact = legacyContactId ? getRecord('contacts', legacyContactId) : undefined;
  const organization = legacyOrganizationId ? getRecord('organizations', legacyOrganizationId) : undefined;
  const source = String(lead.source_channel || contact?.source || organization?.source || 'identity_reconcile');

  const identity = await resolveCanonicalIdentity({
    organizationName: String(organization?.name || organization?.legal_name || ''),
    organizationType: 'prospect',
    fullName: String(contact?.full_name || contact?.display_name || ''),
    email: String(contact?.email || '') || undefined,
    phone: String(contact?.phone || '') || undefined,
    roleTitle: String(contact?.role_title || '') || undefined,
    source,
    consentStatus: (String(contact?.consent_status || 'unknown') as 'unknown' | 'opted_in' | 'opted_out' | 'contractual'),
    serviceArea: String(organization?.service_area || lead.location || '') || undefined
  });

  if (!identity.ok) {
    return {
      ok: false,
      leadId,
      canonicalOrganizationId: identity.organizationId,
      canonicalContactId: identity.contactId,
      updatedRecordIds: [],
      errors: identity.errors
    };
  }

  const now = new Date().toISOString();
  const opportunity = findRecordBy('opportunities', 'lead_id', leadId);
  const writes: DatabaseReadyWrite[] = [];
  const updatedRecordIds: string[] = [];

  const updatedLead = {
    ...lead,
    organization_id: identity.organizationId || legacyOrganizationId || null,
    contact_id: identity.contactId || legacyContactId || null,
    canonical_organization_id: identity.organizationId || null,
    canonical_contact_id: identity.contactId || null,
    identity_reconciled_at: now,
    updated_at: now
  };
  writes.push({ table: 'leads', id: leadId, action: 'insert', record: updatedLead });
  updatedRecordIds.push(leadId);

  if (opportunity) {
    const opportunityId = String(opportunity.id);
    writes.push({
      table: 'opportunities',
      id: opportunityId,
      action: 'insert',
      record: {
        ...opportunity,
        organization_id: identity.organizationId || null,
        contact_id: identity.contactId || null,
        identity_reconciled_at: now,
        updated_at: now
      }
    });
    updatedRecordIds.push(opportunityId);
  }

  if (legacyContactId && legacyContactId !== identity.contactId && contact) {
    writes.push({
      table: 'contacts',
      id: legacyContactId,
      action: 'insert',
      record: { ...contact, canonical_contact_id: identity.contactId || null, superseded_by_canonical: true, updated_at: now }
    });
    updatedRecordIds.push(legacyContactId);
  }
  if (legacyOrganizationId && legacyOrganizationId !== identity.organizationId && organization) {
    writes.push({
      table: 'organizations',
      id: legacyOrganizationId,
      action: 'insert',
      record: { ...organization, canonical_organization_id: identity.organizationId || null, superseded_by_canonical: true, updated_at: now }
    });
    updatedRecordIds.push(legacyOrganizationId);
  }

  const auditId = stableId('audit', `${leadId}:reconcile:${now}`);
  writes.push({
    table: 'audit_logs',
    id: auditId,
    action: 'insert',
    record: {
      id: auditId,
      actor,
      action: 'reconcile_lead_identity',
      target_table: 'leads',
      target_id: leadId,
      risk_level: 'medium',
      allowed: 1,
      reason: `Reconciled lead to canonical organization ${identity.organizationId || 'none'} and contact ${identity.contactId || 'none'}.`,
      created_at: now,
      updated_at: now
    }
  });

  const result = await persistDatabaseReadyWrites(writes);
  return {
    ok: result.errors.length === 0,
    leadId,
    opportunityId: opportunity ? String(opportunity.id) : undefined,
    canonicalOrganizationId: identity.organizationId,
    canonicalContactId: identity.contactId,
    updatedRecordIds,
    errors: result.errors
  };
}
