import { z } from "zod";

export const revenueLanes = [
  "field_service",
  "dispatch",
  "autoworks",
  "hauling",
  "procurement",
  "products",
  "affiliate",
  "retainer",
] as const;

export const leadPriorities = ["P0", "P1", "P2", "P3"] as const;
export const reviewActions = [
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
] as const;

const optionalText = z.string().trim().min(1).max(500).optional();
const nullableUuid = z.string().uuid().nullable().optional();
const money = z.number().finite().min(-1_000_000_000).max(1_000_000_000);

export const locationSchema = z.object({
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

export const organizationInputSchema = z.object({
  legalName: z.string().trim().min(2).max(250),
  displayName: z.string().trim().min(1).max(250).optional(),
  organizationType: z.enum([
    "client",
    "vendor",
    "partner",
    "prospect",
    "technician_company",
    "internal",
  ]),
  website: z.string().url().optional(),
  phone: optionalText,
  email: z.string().email().optional(),
  source: optionalText,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const contactInputSchema = z.object({
  organizationId: nullableUuid,
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  displayName: z.string().trim().min(1).max(250).optional(),
  email: z.string().email().optional(),
  phone: optionalText,
  roleTitle: z.string().trim().min(1).max(180).optional(),
  contactType: z.enum(["business", "client", "vendor", "technician", "prospect", "internal"]).default("business"),
  consentStatus: z.enum(["unknown", "opted_in", "opted_out", "contractual"]).default("unknown"),
  source: optionalText,
  metadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, ctx) => {
  if (!value.email && !value.phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one contact method is required.",
      path: ["email"],
    });
  }
});

export const leadInputSchema = z.object({
  organizationId: nullableUuid,
  contactId: nullableUuid,
  lane: z.enum(revenueLanes),
  title: z.string().trim().min(3).max(250),
  description: z.string().trim().max(10_000).optional(),
  source: z.string().trim().min(1).max(120),
  sourceExternalId: z.string().trim().min(1).max(250).optional(),
  serviceLocation: locationSchema.default({ countryCode: "US" }),
  estimatedValue: money.nonnegative().optional(),
  urgency: z.enum(["low", "normal", "high", "emergency"]).default("normal"),
  priority: z.enum(leadPriorities).default("P2"),
  aiConfidence: z.number().min(0).max(1).optional(),
  dedupeKey: z.string().trim().min(8).max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const opportunityInputSchema = z.object({
  leadId: nullableUuid,
  organizationId: nullableUuid,
  contactId: nullableUuid,
  lane: z.enum(revenueLanes),
  title: z.string().trim().min(3).max(250),
  expectedValue: money.nonnegative().optional(),
  probability: z.number().min(0).max(1).optional(),
  expectedCloseDate: z.string().date().optional(),
  nextAction: z.string().trim().max(2_000).optional(),
  aiScore: z.number().finite().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const aiActionInputSchema = z.object({
  agentName: z.string().trim().min(2).max(120),
  actionType: z.string().trim().min(2).max(120),
  entityType: z.string().trim().min(2).max(120),
  entityId: nullableUuid,
  recommendation: z.record(z.string(), z.unknown()),
  rationale: z.record(z.string(), z.unknown()).default({}),
  confidence: z.number().min(0).max(1).optional(),
});

export const reviewActionInputSchema = z.object({
  aiActionId: nullableUuid,
  entityType: z.string().trim().min(2).max(120),
  entityId: nullableUuid,
  action: z.enum(reviewActions),
  actorId: nullableUuid,
  note: z.string().trim().max(5_000).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const dispatchInputSchema = z.object({
  opportunityId: nullableUuid,
  organizationId: nullableUuid,
  contactId: nullableUuid,
  routeStackId: nullableUuid,
  lane: z.enum(revenueLanes).default("field_service"),
  serviceType: z.string().trim().min(2).max(250),
  serviceLocation: locationSchema,
  technicianId: nullableUuid,
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  slaDueAt: z.string().datetime().optional(),
  quotedAmount: money.nonnegative().optional(),
  estimatedCost: money.nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, ctx) => {
  if (value.scheduledStart && value.scheduledEnd) {
    const start = Date.parse(value.scheduledStart);
    const end = Date.parse(value.scheduledEnd);
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scheduledEnd must be after scheduledStart.",
        path: ["scheduledEnd"],
      });
    }
  }
});

export const revenueEventInputSchema = z.object({
  organizationId: nullableUuid,
  contactId: nullableUuid,
  opportunityId: nullableUuid,
  dispatchId: nullableUuid,
  lane: z.enum(revenueLanes),
  eventType: z.enum(["quoted", "booked", "invoiced", "paid", "commission", "affiliate", "refund", "expense", "adjustment"]),
  amount: money,
  currency: z.string().trim().length(3).default("USD"),
  occurredAt: z.string().datetime().optional(),
  source: optionalText,
  externalReference: z.string().trim().min(1).max(250).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type OrganizationInput = z.infer<typeof organizationInputSchema>;
export type ContactInput = z.infer<typeof contactInputSchema>;
export type LeadInput = z.infer<typeof leadInputSchema>;
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;
export type AiActionInput = z.infer<typeof aiActionInputSchema>;
export type ReviewActionInput = z.infer<typeof reviewActionInputSchema>;
export type DispatchInput = z.infer<typeof dispatchInputSchema>;
export type RevenueEventInput = z.infer<typeof revenueEventInputSchema>;

export function buildLeadDedupeKey(input: Pick<LeadInput, "source" | "sourceExternalId" | "title" | "lane">): string {
  const external = input.sourceExternalId?.trim().toLowerCase();
  if (external) return `${input.source.trim().toLowerCase()}:${external}`;
  return [input.source, input.lane, input.title]
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
    .join(":");
}
