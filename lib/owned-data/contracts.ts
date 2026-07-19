import { z } from "zod";

export const RevenueLaneSchema = z.enum([
  "field_service",
  "dispatch",
  "autoworks",
  "hauling",
  "procurement",
  "products",
  "affiliate",
  "retainer",
]);
export const PrioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
export const LeadStatusSchema = z.enum(["new", "qualified", "passed", "converted", "closed", "archived"]);
export const OpportunityStageSchema = z.enum([
  "qualified",
  "quoted",
  "approved",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
  "lost",
  "archived",
]);
export const ReviewActionSchema = z.enum([
  "review",
  "approve",
  "reject",
  "pass",
  "reply",
  "assign",
  "schedule",
  "dispatch",
  "archive",
  "escalate",
]);

const OptionalUuid = z.string().uuid().nullable().optional();
const OptionalMoney = z.number().finite().nonnegative().nullable().optional();
const Money = z.number().finite().min(-1_000_000_000).max(1_000_000_000);

export const LocationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  addressLine1: z.string().trim().min(1).max(250).optional(),
  addressLine2: z.string().trim().min(1).max(250).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  state: z.string().trim().min(2).max(80).optional(),
  postalCode: z.string().trim().min(3).max(20).optional(),
  countryCode: z.string().trim().length(2).default("US"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accessNotes: z.string().trim().max(2_000).optional(),
});

export const OrganizationInputSchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  displayName: z.string().trim().min(1).max(200).nullable().optional(),
  organizationType: z.enum(["client", "vendor", "partner", "prospect", "technician_company", "internal"]),
  website: z.string().url().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().email().nullable().optional(),
  source: z.string().trim().max(100).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const ContactInputSchema = z.object({
  organizationId: OptionalUuid,
  firstName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().max(100).nullable().optional(),
  displayName: z.string().trim().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  roleTitle: z.string().trim().max(150).nullable().optional(),
  contactType: z.enum(["business", "client", "vendor", "technician", "prospect", "internal"]).default("business"),
  consentStatus: z.enum(["unknown", "opted_in", "opted_out", "contractual"]).default("unknown"),
  source: z.string().trim().max(100).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).refine((value) => Boolean(value.email || value.phone || value.displayName || value.firstName || value.lastName), {
  message: "At least one contact identity field is required",
});

export const LeadInputSchema = z.object({
  organizationId: OptionalUuid,
  contactId: OptionalUuid,
  lane: RevenueLaneSchema,
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().max(8000).nullable().optional(),
  source: z.string().trim().min(2).max(100),
  sourceExternalId: z.string().trim().max(240).nullable().optional(),
  serviceLocation: LocationSchema.default({ countryCode: "US" }),
  estimatedValue: OptionalMoney,
  urgency: z.enum(["low", "normal", "high", "emergency"]).default("normal"),
  priority: PrioritySchema.default("P2"),
  aiConfidence: z.number().min(0).max(1).nullable().optional(),
  ownerId: OptionalUuid,
  dedupeKey: z.string().trim().max(300).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const OpportunityInputSchema = z.object({
  leadId: OptionalUuid,
  organizationId: OptionalUuid,
  contactId: OptionalUuid,
  lane: RevenueLaneSchema,
  title: z.string().trim().min(3).max(240),
  stage: OpportunityStageSchema.default("qualified"),
  expectedValue: OptionalMoney,
  probability: z.number().min(0).max(1).nullable().optional(),
  expectedCloseDate: z.string().date().nullable().optional(),
  nextAction: z.string().trim().max(2000).nullable().optional(),
  ownerId: OptionalUuid,
  aiScore: z.number().finite().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const AiActionInputSchema = z.object({
  agentName: z.string().trim().min(2).max(120),
  actionType: z.string().trim().min(2).max(120),
  entityType: z.string().trim().min(2).max(100),
  entityId: OptionalUuid,
  recommendation: z.record(z.string(), z.unknown()),
  rationale: z.record(z.string(), z.unknown()).default({}),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export const ReviewActionInputSchema = z.object({
  aiActionId: OptionalUuid,
  entityType: z.string().trim().min(2).max(100),
  entityId: OptionalUuid,
  action: ReviewActionSchema,
  actorId: OptionalUuid,
  note: z.string().trim().max(4000).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const DispatchInputSchema = z.object({
  opportunityId: OptionalUuid,
  organizationId: OptionalUuid,
  contactId: OptionalUuid,
  routeStackId: OptionalUuid,
  lane: RevenueLaneSchema.default("field_service"),
  serviceType: z.string().trim().min(2).max(250),
  serviceLocation: LocationSchema,
  technicianId: OptionalUuid,
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  slaDueAt: z.string().datetime().nullable().optional(),
  quotedAmount: OptionalMoney,
  estimatedCost: OptionalMoney,
  metadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, ctx) => {
  if (value.scheduledStart && value.scheduledEnd && Date.parse(value.scheduledEnd) <= Date.parse(value.scheduledStart)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "scheduledEnd must be after scheduledStart",
      path: ["scheduledEnd"],
    });
  }
});

export const RevenueEventInputSchema = z.object({
  organizationId: OptionalUuid,
  contactId: OptionalUuid,
  opportunityId: OptionalUuid,
  dispatchId: OptionalUuid,
  lane: RevenueLaneSchema,
  eventType: z.enum(["quoted", "booked", "invoiced", "paid", "commission", "affiliate", "refund", "expense", "adjustment"]),
  amount: Money,
  currency: z.string().trim().length(3).default("USD"),
  occurredAt: z.string().datetime().nullable().optional(),
  source: z.string().trim().max(100).nullable().optional(),
  externalReference: z.string().trim().max(250).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type OrganizationInput = z.infer<typeof OrganizationInputSchema>;
export type ContactInput = z.infer<typeof ContactInputSchema>;
export type LeadInput = z.infer<typeof LeadInputSchema>;
export type OpportunityInput = z.infer<typeof OpportunityInputSchema>;
export type AiActionInput = z.infer<typeof AiActionInputSchema>;
export type ReviewActionInput = z.infer<typeof ReviewActionInputSchema>;
export type DispatchInput = z.infer<typeof DispatchInputSchema>;
export type RevenueEventInput = z.infer<typeof RevenueEventInputSchema>;

export function buildLeadDedupeKey(input: Pick<LeadInput, "source" | "sourceExternalId" | "title" | "lane">): string {
  const external = input.sourceExternalId?.trim().toLowerCase();
  if (external) return `${input.source.trim().toLowerCase()}:${external}`;
  return [input.source, input.lane, input.title]
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
    .join(":");
}

export interface OwnedRecord {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeadRecord extends OwnedRecord {
  lane: string;
  title: string;
  source: string;
  status: z.infer<typeof LeadStatusSchema>;
  priority: z.infer<typeof PrioritySchema>;
  estimatedValue: number | null;
  organizationId: string | null;
  contactId: string | null;
}

export interface OpportunityRecord extends OwnedRecord {
  leadId: string | null;
  lane: string;
  title: string;
  stage: z.infer<typeof OpportunityStageSchema>;
  expectedValue: number | null;
  probability: number | null;
}

export interface DashboardSnapshot {
  generatedAt: string;
  leads: { new: number; qualified: number; total: number };
  opportunities: { open: number; weightedPipeline: number; totalPipeline: number };
  dispatches: { open: number; scheduledToday: number; completedToday: number };
  revenue: { bookedToday: number; paidToday: number; paidMonthToDate: number };
  aiReviewQueue: { pending: number };
  systemHealth: { healthy: number; degraded: number; unhealthy: number };
}
