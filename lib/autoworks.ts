import { canonicalId, canonicalSlug, normalizeEmail, normalizePhone } from './canonical-ids';
import { getCanonicalStore } from './canonical-store';
import type { DatabaseReadyWrite } from './canonical-store';
import type { TechnicianProfile } from './technician';

export interface AutoworksVehicle {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  licensePlate?: string;
  color?: string;
}

export interface AutoworksCondition {
  exteriorPhotos?: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
  interiorPhotos?: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
  underHoodPhoto?: { filename: string; mimeType: string; sizeBytes: number };
  dashboardPhoto?: { filename: string; mimeType: string; sizeBytes: number };
  batteryCondition?: string;
  warningLights?: string[];
  existingDamage?: string;
}

export interface AutoworksIntakeInput {
  source: string;
  sourceId?: string;
  channel?: string;
  customerName: string;
  company: string;
  email: string;
  phone?: string;
  vehicle: AutoworksVehicle;
  locationAddress?: string;
  locationCity: string;
  locationState: string;
  locationZip?: string;
  complaint: string;
  condition?: AutoworksCondition;
  serviceType?: string;
  requestedDate?: string;
  requestedWindow?: string;
  estimatedValueCents?: number;
  submittedAt?: string;
}

export interface AutoworksPart {
  name: string;
  quantity?: number;
  costCents: number;
}

export interface AutoworksCloseoutInput {
  jobId: string;
  technicianId?: string;
  diagnosis: string;
  recommendedRepair: string;
  customerAuthorization: boolean;
  parts: AutoworksPart[];
  laborCents: number;
  completionPhotos?: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
  customerAcceptance: boolean;
  revenueCents: number;
  technicianPayoutCents?: number;
  paymentStatus?: 'booked' | 'invoiced' | 'collected';
}

export interface AutoworksJobRecord {
  id: string;
  lane: 'autoworks';
  organization_id: string;
  contact_id: string;
  vehicle_id: string;
  source: string;
  source_id: string | null;
  customer_name: string;
  company: string;
  email: string;
  phone: string | null;
  location_address: string | null;
  location_city: string;
  location_state: string;
  location_zip: string | null;
  complaint: string;
  condition: AutoworksCondition | null;
  service_type: string;
  requested_date: string | null;
  requested_window: string | null;
  estimated_value_cents: number;
  status: 'queued_for_review' | 'assigned' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface AutoworksCloseoutRecord {
  id: string;
  lane: 'autoworks';
  job_id: string;
  technician_id: string | null;
  diagnosis: string;
  recommended_repair: string;
  customer_authorization: boolean;
  parts: Array<{ name: string; quantity: number; costCents: number }>;
  labor_cents: number;
  completion_photos: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
  customer_acceptance: boolean;
  revenue_cents: number;
  technician_payout_cents: number;
  gross_margin_cents: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

function formatVin(vin?: string): string | undefined {
  return vin?.trim().toUpperCase() || undefined;
}

export function buildAutoworksIntakeRecords(input: AutoworksIntakeInput): DatabaseReadyWrite[] {
  const now = input.submittedAt ?? new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const orgKey = canonicalSlug(input.company);
  const orgId = canonicalId('org', orgKey);
  const contactKey = normalizedEmail || normalizedPhone || canonicalSlug(input.customerName);
  const contactId = canonicalId('contact', orgId, contactKey);

  const vehicleVin = formatVin(input.vehicle.vin);
  const vehicleKey = vehicleVin || canonicalSlug(`${input.vehicle.make ?? ''}-${input.vehicle.model ?? ''}-${input.vehicle.year ?? ''}`);
  const vehicleId = canonicalId('vehicle', orgId, vehicleKey);

  const jobId = canonicalId('job', input.source, input.sourceId ?? canonicalSlug(input.complaint), now);

  const vehicleRecord: Record<string, unknown> = {
    id: vehicleId,
    organization_id: orgId,
    contact_id: contactId,
    vin: vehicleVin ?? null,
    year: input.vehicle.year ?? null,
    make: (input.vehicle.make ?? '').trim() || null,
    model: (input.vehicle.model ?? '').trim() || null,
    mileage: input.vehicle.mileage ?? null,
    license_plate: (input.vehicle.licensePlate ?? '').trim().toUpperCase() || null,
    color: (input.vehicle.color ?? '').trim() || null,
    source: input.source,
    source_id: input.sourceId ?? null,
    created_at: now,
    updated_at: now
  };

  const orgRecord: Record<string, unknown> = {
    id: orgId,
    name: input.company.trim(),
    organization_type: 'customer',
    source: input.source,
    source_id: input.sourceId ?? null,
    service_area: `${input.locationCity}, ${input.locationState.toUpperCase()}`,
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
    channel: input.channel ?? 'web',
    role: 'vehicle_owner',
    aliases: [input.customerName, normalizedEmail, normalizedPhone].filter(Boolean),
    created_at: now,
    updated_at: now
  };

  const job: AutoworksJobRecord = {
    id: jobId,
    lane: 'autoworks',
    organization_id: orgId,
    contact_id: contactId,
    vehicle_id: vehicleId,
    source: input.source,
    source_id: input.sourceId ?? null,
    customer_name: input.customerName.trim(),
    company: input.company.trim(),
    email: normalizedEmail,
    phone: normalizedPhone || null,
    location_address: (input.locationAddress ?? '').trim() || null,
    location_city: input.locationCity.trim(),
    location_state: input.locationState.trim().toUpperCase(),
    location_zip: (input.locationZip ?? '').trim() || null,
    complaint: input.complaint.trim(),
    condition: input.condition ?? null,
    service_type: (input.serviceType ?? 'mechanic_intake').trim(),
    requested_date: input.requestedDate?.trim() || null,
    requested_window: input.requestedWindow?.trim() || null,
    estimated_value_cents: input.estimatedValueCents ?? 0,
    status: 'queued_for_review',
    created_at: now,
    updated_at: now
  };

  return [
    { table: 'organizations', id: orgId, action: 'insert', record: orgRecord },
    { table: 'contacts', id: contactId, action: 'insert', record: contactRecord },
    { table: 'vehicles', id: vehicleId, action: 'insert', record: vehicleRecord },
    { table: 'jobs', id: jobId, action: 'insert', record: job as unknown as Record<string, unknown> },
    {
      table: 'opportunities',
      id: canonicalId('opp', jobId),
      action: 'insert',
      record: {
        id: canonicalId('opp', jobId),
        organization_id: orgId,
        contact_id: contactId,
        vehicle_id: vehicleId,
        job_id: jobId,
        title: `${job.service_type} — ${input.vehicle.year ?? ''} ${input.vehicle.make ?? ''} ${input.vehicle.model ?? ''}`.replace(/\s+/g, ' ').trim(),
        estimated_value_cents: job.estimated_value_cents,
        status: 'open',
        source: input.source,
        created_at: now,
        updated_at: now
      } as unknown as Record<string, unknown>
    }
  ];
}

export function buildAutoworksCloseoutRecords(input: AutoworksCloseoutInput): DatabaseReadyWrite[] {
  const now = new Date().toISOString();
  const closeoutId = canonicalId('closeout', input.jobId, now);
  const revenueId = canonicalId('revenue', closeoutId);

  const parts = (input.parts ?? []).map((p) => ({
    name: p.name.trim(),
    quantity: p.quantity ?? 1,
    costCents: p.costCents
  }));
  const partsCostCents = parts.reduce((sum, p) => sum + p.costCents * p.quantity, 0);
  const technicianPayoutCents = input.technicianPayoutCents ?? 0;
  const grossMarginCents = input.revenueCents - (partsCostCents + technicianPayoutCents + input.laborCents);

  const closeout: AutoworksCloseoutRecord = {
    id: closeoutId,
    lane: 'autoworks',
    job_id: input.jobId,
    technician_id: input.technicianId ?? null,
    diagnosis: input.diagnosis.trim(),
    recommended_repair: input.recommendedRepair.trim(),
    customer_authorization: input.customerAuthorization,
    parts,
    labor_cents: input.laborCents,
    completion_photos: (input.completionPhotos ?? []).map((p) => ({ filename: p.filename, mimeType: p.mimeType, sizeBytes: p.sizeBytes })),
    customer_acceptance: input.customerAcceptance,
    revenue_cents: input.revenueCents,
    technician_payout_cents: technicianPayoutCents,
    gross_margin_cents: grossMarginCents,
    payment_status: input.paymentStatus ?? 'booked',
    created_at: now,
    updated_at: now
  };

  const revenueEvent: Record<string, unknown> = {
    id: revenueId,
    lane: 'autoworks',
    job_id: input.jobId,
    closeout_id: closeoutId,
    source: 'autoworks_closeout',
    amount_cents: input.revenueCents,
    cost_cents: partsCostCents + technicianPayoutCents + input.laborCents,
    gross_margin_cents: grossMarginCents,
    payment_status: input.paymentStatus ?? 'booked',
    status: input.paymentStatus ?? 'booked',
    recorded_at: now,
    created_at: now,
    updated_at: now
  };

  return [
    { table: 'closeouts', id: closeoutId, action: 'insert', record: closeout as unknown as Record<string, unknown> },
    { table: 'revenue_events', id: revenueId, action: 'insert', record: revenueEvent },
    {
      table: 'jobs',
      id: input.jobId,
      action: 'insert',
      record: {
        id: input.jobId,
        status: 'closed',
        closeout_id: closeoutId,
        revenue_cents: input.revenueCents,
        gross_margin_cents: grossMarginCents,
        updated_at: now
      } as unknown as Record<string, unknown>
    },
    {
      table: 'opportunities',
      id: canonicalId('opp', input.jobId),
      action: 'insert',
      record: {
        id: canonicalId('opp', input.jobId),
        status: input.paymentStatus === 'collected' ? 'won' : 'open',
        actual_value_cents: input.revenueCents,
        updated_at: now
      } as unknown as Record<string, unknown>
    }
  ];
}

export async function matchTechniciansForAutoworksJob(jobId: string) {
  const store = getCanonicalStore();
  const job = await store.getRecord('jobs', jobId) as AutoworksJobRecord | undefined;
  if (!job) return { jobId, matches: [] };

  const { matchTechnicians } = await import('./technician');
  const technicians = await store.queryTable('technicians', 1000) as unknown as TechnicianProfile[];
  const state = job.location_state;

  const matches = matchTechnicians(technicians, {
    state,
    skillKeywords: ['mechanic', 'automotive', 'auto', 'diagnostics', 'repair'],
    sameDay: false,
    weekend: false,
    requireReliableTransport: true
  });

  return {
    jobId,
    matches: matches.slice(0, 10).map((m) => ({
      technicianId: m.technician.id,
      full_name: m.technician.full_name,
      fitScore: m.fitScore,
      dispatchReadinessScore: m.technician.dispatch_readiness_score,
      explanation: m.explanation
    }))
  };
}
