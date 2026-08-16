import { canonicalId, canonicalSlug, normalizeEmail, normalizePhone } from './canonical-ids';
import type { DatabaseReadyWrite } from './canonical-store';

export interface AhfosSite {
  name?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
}

export interface AhfosEquipment {
  name: string;
  category?: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  assetTag?: string;
  location?: string;
}

export interface AhfosPhoto {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
}

export interface AhfosCloseoutInput {
  source: string;
  sourceId?: string;
  customerName: string;
  company: string;
  email: string;
  phone?: string;
  site: AhfosSite;
  equipment: AhfosEquipment;
  problemDescription: string;
  resolutionDescription: string;
  technicianId?: string;
  qaStatus?: 'pass' | 'fail' | 'needs_review';
  proofPhotos?: AhfosPhoto[];
  testResults?: string;
  customerSignatureReceived?: boolean;
  revenueCents: number;
  technicianPayoutCents?: number;
  partsUsed?: string[];
  materialsUsed?: string[];
  submittedAt?: string;
  paymentStatus?: 'booked' | 'invoiced' | 'collected';
}

export interface AhfosJobRecord {
  id: string;
  lane: 'ahfos';
  organization_id: string;
  contact_id: string;
  asset_id: string;
  source: string;
  source_id: string | null;
  customer_name: string;
  company: string;
  email: string;
  phone: string | null;
  site_name: string | null;
  site_address: string;
  site_city: string;
  site_state: string;
  site_zip: string | null;
  equipment_name: string;
  equipment_category: string | null;
  equipment_make: string | null;
  equipment_model: string | null;
  equipment_serial: string | null;
  equipment_asset_tag: string | null;
  problem_description: string;
  service_type: string;
  status: 'closed';
  created_at: string;
  updated_at: string;
}

export interface AhfosCloseoutRecord {
  id: string;
  lane: 'ahfos';
  job_id: string;
  assignment_id: string;
  technician_id: string | null;
  site_name: string | null;
  site_address: string;
  site_city: string;
  site_state: string;
  equipment_name: string;
  equipment_category: string | null;
  equipment_make: string | null;
  equipment_model: string | null;
  equipment_serial: string | null;
  problem_description: string;
  resolution_description: string;
  test_results: string;
  customer_signature_received: boolean;
  photos: AhfosPhoto[];
  parts_used: string[];
  materials_used: string[];
  qa_status: string;
  revenue_cents: number;
  technician_payout_cents: number;
  gross_margin_cents: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface AhfosAssetRecord {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  location: string | null;
  source: string;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

function siteKey(site: AhfosSite): string {
  return canonicalSlug(`${site.address}-${site.city}-${site.state}`);
}

function equipmentKey(equipment: AhfosEquipment, orgId: string): string {
  const serial = equipment.serialNumber?.trim().toUpperCase() || '';
  const tag = equipment.assetTag?.trim().toUpperCase() || '';
  const name = canonicalSlug(equipment.name);
  return canonicalSlug(`${orgId}-${name}-${serial}-${tag}`);
}

export function buildAhfosCloseoutRecords(input: AhfosCloseoutInput): DatabaseReadyWrite[] {
  const now = input.submittedAt ?? new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const orgKey = canonicalSlug(input.company);
  const orgId = canonicalId('org', orgKey);
  const contactKey = normalizedEmail || normalizedPhone || canonicalSlug(input.customerName);
  const contactId = canonicalId('contact', orgId, contactKey);
  const siteId = canonicalId('site', orgId, siteKey(input.site));
  const assetId = canonicalId('asset', orgId, equipmentKey(input.equipment, orgId));
  const jobId = canonicalId('job', input.source, input.sourceId ?? assetId, now);
  const assignmentId = canonicalId('assignment', jobId, input.technicianId ?? 'unassigned', now);
  const closeoutId = canonicalId('closeout', jobId, now);
  const revenueId = canonicalId('revenue', closeoutId);
  const proofId = canonicalId('proof', closeoutId);

  const revenueCents = input.revenueCents ?? 0;
  const technicianPayoutCents = input.technicianPayoutCents ?? 0;
  const grossMarginCents = revenueCents - technicianPayoutCents;

  const orgRecord: Record<string, unknown> = {
    id: orgId,
    name: input.company.trim(),
    organization_type: 'customer',
    source: input.source,
    source_id: input.sourceId ?? null,
    service_area: `${input.site.city}, ${input.site.state.toUpperCase()}`,
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
    role: 'site_contact',
    aliases: [input.customerName, normalizedEmail, normalizedPhone].filter(Boolean),
    created_at: now,
    updated_at: now
  };

  const assetRecord: AhfosAssetRecord = {
    id: assetId,
    organization_id: orgId,
    name: input.equipment.name.trim(),
    category: input.equipment.category?.trim() || null,
    make: input.equipment.make?.trim() || null,
    model: input.equipment.model?.trim() || null,
    serial_number: input.equipment.serialNumber?.trim().toUpperCase() || null,
    asset_tag: input.equipment.assetTag?.trim().toUpperCase() || null,
    location: input.equipment.location?.trim() || `${input.site.city}, ${input.site.state.toUpperCase()}`,
    source: input.source,
    source_id: input.sourceId ?? null,
    created_at: now,
    updated_at: now
  };

  const siteRecord: Record<string, unknown> = {
    id: siteId,
    organization_id: orgId,
    name: (input.site.name ?? '').trim() || `${input.site.address}, ${input.site.city}, ${input.site.state.toUpperCase()}`,
    address: input.site.address.trim(),
    city: input.site.city.trim(),
    state: input.site.state.trim().toUpperCase(),
    zip: (input.site.zip ?? '').trim() || null,
    source: input.source,
    source_id: input.sourceId ?? null,
    created_at: now,
    updated_at: now
  };

  const job: AhfosJobRecord = {
    id: jobId,
    lane: 'ahfos',
    organization_id: orgId,
    contact_id: contactId,
    asset_id: assetId,
    source: input.source,
    source_id: input.sourceId ?? null,
    customer_name: input.customerName.trim(),
    company: input.company.trim(),
    email: normalizedEmail,
    phone: normalizedPhone || null,
    site_name: siteRecord.name as string | null,
    site_address: input.site.address.trim(),
    site_city: input.site.city.trim(),
    site_state: input.site.state.trim().toUpperCase(),
    site_zip: (input.site.zip ?? '').trim() || null,
    equipment_name: input.equipment.name.trim(),
    equipment_category: input.equipment.category?.trim() || null,
    equipment_make: input.equipment.make?.trim() || null,
    equipment_model: input.equipment.model?.trim() || null,
    equipment_serial: input.equipment.serialNumber?.trim().toUpperCase() || null,
    equipment_asset_tag: input.equipment.assetTag?.trim().toUpperCase() || null,
    problem_description: input.problemDescription.trim(),
    service_type: 'ahfos_field_closeout',
    status: 'closed',
    created_at: now,
    updated_at: now
  };

  const assignment: Record<string, unknown> = {
    id: assignmentId,
    work_order_id: jobId,
    technician_id: input.technicianId ?? null,
    assigned_by: 'ahfos_api',
    rate_cents: 0,
    notes: 'Generated from AHFOS closeout',
    scheduled_start: now,
    scheduled_end: now,
    same_day: false,
    weekend: false,
    status: 'completed',
    created_at: now,
    updated_at: now
  };

  const closeout: AhfosCloseoutRecord = {
    id: closeoutId,
    lane: 'ahfos',
    job_id: jobId,
    assignment_id: assignmentId,
    technician_id: input.technicianId ?? null,
    site_name: job.site_name,
    site_address: job.site_address,
    site_city: job.site_city,
    site_state: job.site_state,
    equipment_name: job.equipment_name,
    equipment_category: job.equipment_category,
    equipment_make: job.equipment_make,
    equipment_model: job.equipment_model,
    equipment_serial: job.equipment_serial,
    problem_description: job.problem_description,
    resolution_description: input.resolutionDescription.trim(),
    test_results: (input.testResults ?? '').trim(),
    customer_signature_received: input.customerSignatureReceived ?? false,
    photos: (input.proofPhotos ?? []).map((p) => ({ filename: p.filename, mimeType: p.mimeType, sizeBytes: p.sizeBytes, caption: p.caption ?? '' })),
    parts_used: (input.partsUsed ?? []).map((s) => s.trim()).filter(Boolean),
    materials_used: (input.materialsUsed ?? []).map((s) => s.trim()).filter(Boolean),
    qa_status: input.qaStatus ?? 'needs_review',
    revenue_cents: revenueCents,
    technician_payout_cents: technicianPayoutCents,
    gross_margin_cents: grossMarginCents,
    payment_status: input.paymentStatus ?? 'booked',
    created_at: now,
    updated_at: now
  };

  const revenueEvent: Record<string, unknown> = {
    id: revenueId,
    lane: 'ahfos',
    job_id: jobId,
    assignment_id: assignmentId,
    closeout_id: closeoutId,
    source: 'ahfos_closeout',
    amount_cents: revenueCents,
    cost_cents: technicianPayoutCents,
    gross_margin_cents: grossMarginCents,
    payment_status: input.paymentStatus ?? 'booked',
    status: input.paymentStatus ?? 'booked',
    recorded_at: now,
    created_at: now,
    updated_at: now
  };

  const proofOfWork: Record<string, unknown> = {
    id: proofId,
    job_id: jobId,
    closeout_id: closeoutId,
    lane: 'ahfos',
    proof_type: 'field_closeout',
    evidence_json: JSON.stringify({
      site: siteRecord,
      equipment: assetRecord,
      problem: input.problemDescription,
      resolution: input.resolutionDescription,
      qa_status: closeout.qa_status,
      photos: closeout.photos
    }),
    outcome_summary: `Resolved ${input.equipment.name}: ${input.problemDescription.slice(0, 120)}`,
    source: input.source,
    created_at: now,
    updated_at: now
  };

  return [
    { table: 'organizations', id: orgId, action: 'insert', record: orgRecord },
    { table: 'contacts', id: contactId, action: 'insert', record: contactRecord },
    { table: 'assets', id: assetId, action: 'insert', record: assetRecord as unknown as Record<string, unknown> },
    { table: 'sites', id: siteId, action: 'insert', record: siteRecord },
    { table: 'jobs', id: jobId, action: 'insert', record: job as unknown as Record<string, unknown> },
    { table: 'assignments', id: assignmentId, action: 'insert', record: assignment },
    { table: 'closeouts', id: closeoutId, action: 'insert', record: closeout as unknown as Record<string, unknown> },
    { table: 'revenue_events', id: revenueId, action: 'insert', record: revenueEvent },
    { table: 'proof_of_work', id: proofId, action: 'insert', record: proofOfWork },
    {
      table: 'opportunities',
      id: canonicalId('opp', jobId),
      action: 'insert',
      record: {
        id: canonicalId('opp', jobId),
        organization_id: orgId,
        contact_id: contactId,
        job_id: jobId,
        asset_id: assetId,
        title: `AHFOS closeout — ${input.equipment.name} at ${input.site.city}, ${job.site_state}`,
        estimated_value_cents: revenueCents,
        actual_value_cents: revenueCents,
        status: input.paymentStatus === 'collected' ? 'won' : 'open',
        source: input.source,
        created_at: now,
        updated_at: now
      } as unknown as Record<string, unknown>
    }
  ];
}
