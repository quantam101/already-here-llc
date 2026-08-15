import { canonicalId, canonicalSlug, normalizeEmail, normalizePhone } from './canonical-ids';
import { getCanonicalStore } from './canonical-store';
import type { DatabaseReadyWrite } from './canonical-store';
import { matchTechnicians, type TechnicianProfile } from './technician';

export interface WorkOrderInput {
  source: string;
  sourceId?: string;
  customerName: string;
  company: string;
  email: string;
  phone?: string;
  siteAddress: string;
  siteCity: string;
  siteState: string;
  siteZip?: string;
  scope: string;
  serviceType: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requestedDate?: string;
  requestedWindow?: string;
  requiredSkills?: string[];
  requiredCertifications?: string[];
  requiredTools?: string[];
  rateBudgetCents?: number;
  estimatedValueCents?: number;
  submittedAt?: string;
}

export interface WorkOrderRecord {
  id: string;
  organization_id: string;
  contact_id: string;
  source: string;
  source_id: string | null;
  customer_name: string;
  company: string;
  email: string;
  phone: string | null;
  site_address: string;
  site_city: string;
  site_state: string;
  site_zip: string | null;
  scope: string;
  service_type: string;
  priority: string;
  requested_date: string | null;
  requested_window: string | null;
  required_skills: string[];
  required_certifications: string[];
  required_tools: string[];
  rate_budget_cents: number;
  estimated_value_cents: number;
  status: 'queued_for_review' | 'matched' | 'assigned' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface AssignmentInput {
  workOrderId: string;
  technicianId: string;
  assignedBy: string;
  rateCents?: number;
  notes?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  sameDay?: boolean;
  weekend?: boolean;
}

export interface AssignmentRecord {
  id: string;
  work_order_id: string;
  technician_id: string;
  assigned_by: string;
  rate_cents: number;
  notes: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  same_day: boolean;
  weekend: boolean;
  status: 'assigned' | 'accepted' | 'declined' | 'checked_in' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CloseoutInput {
  workOrderId: string;
  assignmentId: string;
  technicianId: string;
  actualStart?: string;
  actualEnd?: string;
  completionNotes: string;
  partsUsed?: string[];
  materialsUsed?: string[];
  testingResults?: string;
  customerSignatureReceived?: boolean;
  photos?: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
  qaStatus?: 'pass' | 'fail' | 'needs_review';
  revenueCents: number;
  technicianPayoutCents?: number;
  mileageMiles?: number;
  disposalCostCents?: number;
  recoveryRevenueCents?: number;
}

export interface CloseoutRecord {
  id: string;
  work_order_id: string;
  assignment_id: string;
  technician_id: string;
  actual_start: string | null;
  actual_end: string | null;
  completion_notes: string;
  parts_used: string[];
  materials_used: string[];
  testing_results: string;
  customer_signature_received: boolean;
  photos: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
  qa_status: string;
  revenue_cents: number;
  technician_payout_cents: number;
  mileage_miles: number;
  disposal_cost_cents: number;
  recovery_revenue_cents: number;
  created_at: string;
  updated_at: string;
}

export interface RevenueEventRecord {
  id: string;
  work_order_id: string;
  assignment_id: string;
  closeout_id: string;
  amount_cents: number;
  cost_cents: number;
  gross_margin_cents: number;
  source: string;
  status: 'booked' | 'invoiced' | 'collected';
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderMatchResult {
  workOrderId: string;
  matches: Array<{
    technicianId: string;
    full_name: string;
    fitScore: number;
    dispatchReadinessScore: number;
    explanation: string[];
  }>;
}

export function buildWorkOrderRecords(input: WorkOrderInput): DatabaseReadyWrite[] {
  const now = input.submittedAt ?? new Date().toISOString();
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const orgKey = canonicalSlug(input.company);
  const orgId = canonicalId('org', orgKey);
  const contactKey = normalizedEmail || normalizedPhone || canonicalSlug(input.customerName);
  const contactId = canonicalId('contact', orgId, contactKey);
  const workOrderId = canonicalId('job', input.source, input.sourceId ?? canonicalSlug(input.scope), now);

  const workOrder: WorkOrderRecord = {
    id: workOrderId,
    organization_id: orgId,
    contact_id: contactId,
    source: input.source,
    source_id: input.sourceId ?? null,
    customer_name: input.customerName.trim(),
    company: input.company.trim(),
    email: normalizedEmail,
    phone: normalizedPhone || null,
    site_address: input.siteAddress.trim(),
    site_city: input.siteCity.trim(),
    site_state: input.siteState.trim().toUpperCase(),
    site_zip: input.siteZip?.trim() || null,
    scope: input.scope.trim(),
    service_type: input.serviceType.trim(),
    priority: input.priority ?? 'normal',
    requested_date: input.requestedDate?.trim() || null,
    requested_window: input.requestedWindow?.trim() || null,
    required_skills: (input.requiredSkills ?? []).map((s) => s.trim()).filter(Boolean),
    required_certifications: (input.requiredCertifications ?? []).map((s) => s.trim()).filter(Boolean),
    required_tools: (input.requiredTools ?? []).map((s) => s.trim()).filter(Boolean),
    rate_budget_cents: input.rateBudgetCents ?? 0,
    estimated_value_cents: input.estimatedValueCents ?? 0,
    status: 'queued_for_review',
    created_at: now,
    updated_at: now
  };

  const orgRecord: Record<string, unknown> = {
    id: orgId,
    name: input.company.trim(),
    organization_type: 'customer',
    source: input.source,
    source_id: input.sourceId ?? null,
    service_area: `${input.siteCity}, ${workOrder.site_state}`,
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
    role: 'work_order_contact',
    aliases: [input.customerName, normalizedEmail, normalizedPhone].filter(Boolean),
    created_at: now,
    updated_at: now
  };

  return [
    { table: 'organizations', id: orgId, action: 'insert', record: orgRecord },
    { table: 'contacts', id: contactId, action: 'insert', record: contactRecord },
    { table: 'jobs', id: workOrderId, action: 'insert', record: workOrder as unknown as Record<string, unknown> },
    {
      table: 'opportunities',
      id: canonicalId('opp', workOrderId),
      action: 'insert',
      record: {
        id: canonicalId('opp', workOrderId),
        organization_id: orgId,
        contact_id: contactId,
        job_id: workOrderId,
        title: `${input.serviceType} — ${input.siteCity}, ${workOrder.site_state}`,
        estimated_value_cents: workOrder.estimated_value_cents,
        status: 'open',
        source: input.source,
        created_at: now,
        updated_at: now
      } as unknown as Record<string, unknown>
    }
  ];
}

export function buildAssignmentRecords(input: AssignmentInput): DatabaseReadyWrite[] {
  const now = new Date().toISOString();
  const assignmentId = canonicalId('assignment', input.workOrderId, input.technicianId, now);

  const assignment: AssignmentRecord = {
    id: assignmentId,
    work_order_id: input.workOrderId,
    technician_id: input.technicianId,
    assigned_by: input.assignedBy,
    rate_cents: input.rateCents ?? 0,
    notes: (input.notes ?? '').trim(),
    scheduled_start: input.scheduledStart ?? null,
    scheduled_end: input.scheduledEnd ?? null,
    same_day: input.sameDay ?? false,
    weekend: input.weekend ?? false,
    status: 'assigned',
    created_at: now,
    updated_at: now
  };

  return [
    { table: 'assignments', id: assignmentId, action: 'insert', record: assignment as unknown as Record<string, unknown> },
    {
      table: 'jobs',
      id: input.workOrderId,
      action: 'insert',
      record: {
        id: input.workOrderId,
        status: 'assigned',
        assigned_technician_id: input.technicianId,
        assignment_id: assignmentId,
        assigned_at: now,
        updated_at: now
      } as unknown as Record<string, unknown>
    }
  ];
}

export function buildCloseoutRecords(input: CloseoutInput): DatabaseReadyWrite[] {
  const now = new Date().toISOString();
  const closeoutId = canonicalId('closeout', input.workOrderId, input.assignmentId, now);
  const revenueId = canonicalId('revenue', closeoutId);

  const revenueCents = input.revenueCents ?? 0;
  const technicianPayoutCents = input.technicianPayoutCents ?? 0;
  const disposalCostCents = input.disposalCostCents ?? 0;
  const recoveryRevenueCents = input.recoveryRevenueCents ?? 0;
  const grossMarginCents = revenueCents - (technicianPayoutCents + disposalCostCents);

  const closeout: CloseoutRecord = {
    id: closeoutId,
    work_order_id: input.workOrderId,
    assignment_id: input.assignmentId,
    technician_id: input.technicianId,
    actual_start: input.actualStart ?? null,
    actual_end: input.actualEnd ?? null,
    completion_notes: input.completionNotes.trim(),
    parts_used: (input.partsUsed ?? []).map((s) => s.trim()).filter(Boolean),
    materials_used: (input.materialsUsed ?? []).map((s) => s.trim()).filter(Boolean),
    testing_results: (input.testingResults ?? '').trim(),
    customer_signature_received: input.customerSignatureReceived ?? false,
    photos: (input.photos ?? []).map((p) => ({ filename: p.filename, mimeType: p.mimeType, sizeBytes: p.sizeBytes })),
    qa_status: input.qaStatus ?? 'needs_review',
    revenue_cents: revenueCents,
    technician_payout_cents: technicianPayoutCents,
    mileage_miles: input.mileageMiles ?? 0,
    disposal_cost_cents: disposalCostCents,
    recovery_revenue_cents: recoveryRevenueCents,
    created_at: now,
    updated_at: now
  };

  const revenueEvent: RevenueEventRecord = {
    id: revenueId,
    work_order_id: input.workOrderId,
    assignment_id: input.assignmentId,
    closeout_id: closeoutId,
    amount_cents: revenueCents,
    cost_cents: technicianPayoutCents + disposalCostCents,
    gross_margin_cents: grossMarginCents,
    source: 'field_closeout',
    status: 'booked',
    recorded_at: now,
    created_at: now,
    updated_at: now
  };

  return [
    { table: 'closeouts', id: closeoutId, action: 'insert', record: closeout as unknown as Record<string, unknown> },
    { table: 'revenue_events', id: revenueId, action: 'insert', record: revenueEvent as unknown as Record<string, unknown> },
    {
      table: 'jobs',
      id: input.workOrderId,
      action: 'insert',
      record: {
        id: input.workOrderId,
        status: 'closed',
        closeout_id: closeoutId,
        revenue_cents: revenueCents,
        gross_margin_cents: grossMarginCents,
        updated_at: now
      } as unknown as Record<string, unknown>
    },
    {
      table: 'assignments',
      id: input.assignmentId,
      action: 'insert',
      record: {
        id: input.assignmentId,
        status: 'completed',
        completed_at: now,
        updated_at: now
      } as unknown as Record<string, unknown>
    }
  ];
}

export function matchTechniciansForWorkOrder(workOrderId: string): WorkOrderMatchResult {
  const store = getCanonicalStore();
  const workOrder = store.getRecord('jobs', workOrderId);
  if (!workOrder) return { workOrderId, matches: [] };

  const requiredSkills = ((workOrder.required_skills as string[] | undefined) ?? []).map((s) => s.toLowerCase());
  const state = String(workOrder.site_state ?? '').toUpperCase();
  const technicians = store.queryTable('technicians', 1000) as unknown as TechnicianProfile[];

  const matches = matchTechnicians(technicians, {
    state,
    skillKeywords: requiredSkills.length > 0 ? requiredSkills : [String(workOrder.service_type ?? '').toLowerCase()],
    sameDay: false,
    weekend: false,
    requireReliableTransport: true
  });

  return {
    workOrderId,
    matches: matches.slice(0, 10).map((m) => ({
      technicianId: m.technician.id,
      full_name: m.technician.full_name,
      fitScore: m.fitScore,
      dispatchReadinessScore: m.technician.dispatch_readiness_score,
      explanation: m.explanation
    }))
  };
}
