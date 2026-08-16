import { canonicalId, canonicalSlug, normalizeEmail, normalizePhone } from './canonical-ids';
import { buildFollowUpRecord } from './followups';
import type { DatabaseReadyWrite } from './canonical-store';

function trimComma(value: string): string {
  return value.replace(/^[,\s]+|[,\s]+$/g, '');
}

export interface AssetIntakeInput {
  source: string;
  sourceId?: string;
  customerName: string;
  company: string;
  email: string;
  phone?: string;
  assetName: string;
  category?: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  assetTag?: string;
  location?: string;
  siteName?: string;
  siteAddress?: string;
  siteCity?: string;
  siteState?: string;
  siteZip?: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  notes?: string;
  submittedAt?: string;
}

export interface MaintenanceInput {
  assetId: string;
  source: string;
  sourceId?: string;
  maintenanceType: 'inspection' | 'calibration' | 'certification' | 'repair' | 'maintenance' | 'cleaning' | 'other';
  performedBy?: string;
  performedAt?: string;
  dueDate?: string;
  result: 'pass' | 'fail' | 'needs_review' | 'scheduled';
  notes?: string;
  costCents?: number;
  technicianId?: string;
  submittedAt?: string;
}

export interface AssetRecord {
  id: string;
  organization_id: string;
  contact_id: string;
  site_id?: string | null;
  name: string;
  category: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  location: string | null;
  purchase_date: string | null;
  warranty_expiry_date: string | null;
  status: 'active' | 'retired' | 'in_repair' | 'lost';
  source: string;
  source_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  organization_id: string;
  maintenance_type: string;
  performed_by: string | null;
  performed_at: string | null;
  due_date: string | null;
  result: string;
  notes: string | null;
  cost_cents: number;
  technician_id: string | null;
  source: string;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

function equipmentKey(input: AssetIntakeInput, orgId: string): string {
  const serial = input.serialNumber?.trim().toUpperCase() || '';
  const tag = input.assetTag?.trim().toUpperCase() || '';
  const name = canonicalSlug(input.assetName);
  return canonicalSlug(`${orgId}-${name}-${serial}-${tag}`);
}

export function buildAssetIntakeRecords(input: AssetIntakeInput): DatabaseReadyWrite[] {
  const now = input.submittedAt ?? new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const orgKey = canonicalSlug(input.company);
  const orgId = canonicalId('org', orgKey);
  const contactKey = normalizedEmail || normalizedPhone || canonicalSlug(input.customerName);
  const contactId = canonicalId('contact', orgId, contactKey);
  const assetId = canonicalId('asset', orgId, equipmentKey(input, orgId));

  const hasSite = (input.siteAddress || input.siteCity || input.siteState || input.siteName);
  const siteId = hasSite
    ? canonicalId('site', orgId, canonicalSlug(`${input.siteName ?? ''}-${input.siteAddress ?? ''}-${input.siteCity ?? ''}-${input.siteState ?? ''}`))
    : null;

  const domain = normalizedEmail?.split('@')[1] || '';
  const orgAliases = [input.company];
  if (domain && domain.includes('.')) orgAliases.push(domain);

  const contactAliases = [input.customerName];
  if (normalizedEmail) contactAliases.push(normalizedEmail);
  if (normalizedPhone) contactAliases.push(normalizedPhone);

  const orgRecord: Record<string, unknown> = {
    id: orgId,
    name: input.company.trim(),
    organization_type: 'customer',
    source: input.source,
    source_id: input.sourceId ?? null,
    domain: domain || null,
    aliases: orgAliases,
    service_area: trimComma(`${input.siteCity ?? ''}, ${(input.siteState ?? '').toUpperCase()}`) || null,
    created_at: now,
    updated_at: now
  };

  const contactRecord: Record<string, unknown> = {
    id: contactId,
    organization_id: orgId,
    full_name: input.customerName.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    source: input.source,
    source_id: input.sourceId ?? null,
    channel: 'web',
    role: 'asset_owner',
    aliases: contactAliases,
    created_at: now,
    updated_at: now
  };

  const asset: AssetRecord = {
    id: assetId,
    organization_id: orgId,
    contact_id: contactId,
    site_id: siteId,
    name: input.assetName.trim(),
    category: input.category?.trim() || null,
    make: input.make?.trim() || null,
    model: input.model?.trim() || null,
    serial_number: input.serialNumber?.trim().toUpperCase() || null,
    asset_tag: input.assetTag?.trim().toUpperCase() || null,
    location: input.location?.trim() || trimComma(`${input.siteCity ?? ''}, ${(input.siteState ?? '').toUpperCase()}`) || null,
    purchase_date: input.purchaseDate?.trim() || null,
    warranty_expiry_date: input.warrantyExpiryDate?.trim() || null,
    status: 'active',
    source: input.source,
    source_id: input.sourceId ?? null,
    notes: (input.notes ?? '').trim() || null,
    created_at: now,
    updated_at: now
  };

  const siteRecord: Record<string, unknown> | null = siteId
    ? {
        id: siteId,
        organization_id: orgId,
        name: (input.siteName ?? '').trim() || trimComma(`${input.siteAddress ?? ''}, ${input.siteCity ?? ''}, ${(input.siteState ?? '').toUpperCase()}`) || 'Unnamed site',
        address: (input.siteAddress ?? '').trim() || null,
        city: (input.siteCity ?? '').trim() || null,
        state: (input.siteState ?? '').trim().toUpperCase() || null,
        zip: (input.siteZip ?? '').trim() || null,
        source: input.source,
        source_id: input.sourceId ?? null,
        created_at: now,
        updated_at: now
      }
    : null;

  const writes: DatabaseReadyWrite[] = [
    { table: 'organizations', id: orgId, action: 'insert', record: orgRecord },
    { table: 'contacts', id: contactId, action: 'insert', record: contactRecord },
    { table: 'assets', id: assetId, action: 'insert', record: asset as unknown as Record<string, unknown> }
  ];

  if (siteRecord && siteId) {
    writes.push({ table: 'sites', id: siteId, action: 'insert', record: siteRecord });
  }

  return writes;
}

export function buildMaintenanceRecord(input: MaintenanceInput, assetRecord: AssetRecord): DatabaseReadyWrite {
  const now = input.submittedAt ?? new Date().toISOString();
  const maintenanceId = canonicalId('maintenance', input.assetId, input.maintenanceType, now);

  const record: MaintenanceRecord = {
    id: maintenanceId,
    asset_id: input.assetId,
    organization_id: assetRecord.organization_id,
    maintenance_type: input.maintenanceType.trim(),
    performed_by: input.performedBy?.trim() || null,
    performed_at: input.performedAt?.trim() || now,
    due_date: input.dueDate?.trim() || null,
    result: input.result.trim(),
    notes: (input.notes ?? '').trim() || null,
    cost_cents: input.costCents ?? 0,
    technician_id: input.technicianId?.trim() || null,
    source: input.source,
    source_id: input.sourceId ?? null,
    created_at: now,
    updated_at: now
  };

  return { table: 'maintenance', id: maintenanceId, action: 'insert', record: record as unknown as Record<string, unknown> };
}

export function buildAssetIntakeWithFollowUp(input: AssetIntakeInput): DatabaseReadyWrite[] {
  const now = input.submittedAt ?? new Date().toISOString();
  const writes = buildAssetIntakeRecords(input);
  const orgId = writes.find((w) => w.table === 'organizations')!.id;
  const contactId = writes.find((w) => w.table === 'contacts')!.id;
  const assetId = writes.find((w) => w.table === 'assets')!.id;

  const followUp = buildFollowUpRecord({
    source: input.source,
    sourceId: input.sourceId,
    organizationId: orgId,
    contactId,
    relatedRecordType: 'asset',
    relatedRecordId: assetId,
    lane: 'asset_lifecycle',
    purpose: `Asset lifecycle intake: ${input.assetName} at ${input.company}`,
    channel: 'email',
    offer: 'Equipment Lifecycle Assessment',
    status: 'open',
    createdAt: now
  });

  return [...writes, followUp];
}
