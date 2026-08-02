import { z } from 'zod';

export const AhfosRoleSchema = z.enum([
  'customer',
  'dispatcher',
  'project_manager',
  'technician',
  'office_manager',
  'sales',
  'accounting',
  'vendor',
  'admin',
]);

export type AhfosRole = z.infer<typeof AhfosRoleSchema>;

export const ROLES: readonly AhfosRole[] = AhfosRoleSchema.options;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  passwordHash: z.string().min(1),
  name: z.string().min(1).max(160),
  roles: z.array(AhfosRoleSchema).min(1),
  company: z.string().max(200).optional().default(''),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const AddressSchema = z.object({
  line1: z.string().max(200),
  line2: z.string().max(200).optional().default(''),
  city: z.string().max(120),
  state: z.string().max(60),
  zip: z.string().max(20),
  country: z.string().max(60).optional().default('US'),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

export type Address = z.infer<typeof AddressSchema>;

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(160),
  company: z.string().max(200).optional().default(''),
  phone: z.string().max(40),
  email: z.string().email().toLowerCase(),
  addresses: z.array(AddressSchema).default([]),
  createdAt: z.string().datetime(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const AssetSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  siteId: z.string().uuid().optional(),
  category: z.string().max(80),
  make: z.string().max(120).optional().default(''),
  model: z.string().max(120).optional().default(''),
  serial: z.string().max(120).optional().default(''),
  vin: z.string().max(40).optional().default(''),
  assetTag: z.string().max(120).optional().default(''),
  history: z.array(z.object({
    jobId: z.string().uuid(),
    summary: z.string(),
    date: z.string().datetime(),
  })).default([]),
  createdAt: z.string().datetime(),
});

export type Asset = z.infer<typeof AssetSchema>;

export const JobStatusSchema = z.enum([
  'lead',
  'intake',
  'quoted',
  'approved',
  'assigned',
  'in_progress',
  'completed',
  'closed',
  'cancelled',
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobPrioritySchema = z.enum(['low', 'normal', 'high', 'emergency']);

export type JobPriority = z.infer<typeof JobPrioritySchema>;

export const PhotoSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['before', 'after', 'asset', 'other']),
  url: z.string().max(2048),
  caption: z.string().max(500).optional().default(''),
  uploadedAt: z.string().datetime(),
  uploadedBy: z.string().uuid(),
});

export type Photo = z.infer<typeof PhotoSchema>;

export const ChecklistItemSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  checked: z.boolean().default(false),
  checkedAt: z.string().datetime().optional(),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const LaborLineSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(500),
  hours: z.number().nonnegative().default(0),
  rateCents: z.number().int().nonnegative().default(0),
  technicianId: z.string().uuid().optional(),
});

export type LaborLine = z.infer<typeof LaborLineSchema>;

export const MaterialLineSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative().default(1),
  unitCostCents: z.number().int().nonnegative().default(0),
  partNumber: z.string().max(120).optional().default(''),
});

export type MaterialLine = z.infer<typeof MaterialLineSchema>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  status: JobStatusSchema,
  priority: JobPrioritySchema,
  trade: z.string().max(80),
  skill: z.string().max(120),
  estimatedDurationMinutes: z.number().int().nonnegative().default(60),
  customerId: z.string().uuid(),
  siteId: z.string().uuid().optional(),
  assetIds: z.array(z.string().uuid()).default([]),
  intake: z.object({
    requestSource: z.string().max(80).optional().default('portal'),
    problemDescription: z.string().max(4000),
    preferredSchedule: z.string().max(500).optional().default(''),
    urgency: z.string().max(80).optional().default(''),
  }),
  dispatcherPacket: z.object({
    summary: z.string().max(2000),
    suggestedParts: z.array(z.string().max(200)).default([]),
    suggestedCrew: z.array(z.string().max(80)).default([]),
    riskFlags: z.array(z.string().max(200)).default([]),
  }),
  assignedTo: z.string().uuid().optional(),
  checklist: z.array(ChecklistItemSchema).default([]),
  parts: z.array(MaterialLineSchema).default([]),
  labor: z.array(LaborLineSchema).default([]),
  materials: z.array(MaterialLineSchema).default([]),
  recommendations: z.array(z.string().max(500)).default([]),
  beforePhotos: z.array(PhotoSchema).default([]),
  afterPhotos: z.array(PhotoSchema).default([]),
  workNotes: z.string().max(4000).optional().default(''),
  signature: z.object({
    name: z.string().max(160),
    signedAt: z.string().datetime(),
    ip: z.string().max(64).optional(),
  }).optional(),
  warrantyDays: z.number().int().nonnegative().default(30),
  invoice: z.object({
    status: z.enum(['pending', 'sent', 'paid']),
    totalCents: z.number().int().nonnegative().default(0),
    sentAt: z.string().datetime().optional(),
  }).default({ status: 'pending', totalCents: 0 }),
  review: z.object({
    status: z.enum(['pending', 'sent', 'received']),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).optional(),
    sentAt: z.string().datetime().optional(),
  }).default({ status: 'pending' }),
  kbEntryId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Job = z.infer<typeof JobSchema>;

export const JobEventSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  type: z.string().max(80),
  agent: z.string().max(80).optional(),
  actorId: z.string().uuid().optional(),
  actorRole: AhfosRoleSchema.optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().datetime(),
});

export type JobEvent = z.infer<typeof JobEventSchema>;

export const KnowledgeEntrySchema = z.object({
  id: z.string().uuid(),
  problem: z.string().max(2000),
  resolution: z.string().max(4000),
  trade: z.string().max(80),
  parts: z.array(z.string().max(200)).default([]),
  labor: z.array(z.string().max(200)).default([]),
  timeMinutes: z.number().int().nonnegative().default(0),
  costCents: z.number().int().nonnegative().default(0),
  technicianId: z.string().uuid().optional(),
  successRate: z.number().min(0).max(1).default(0),
  sourceJobId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

export const ServiceRequestSchema = z.object({
  name: z.string().min(1).max(160),
  company: z.string().max(200).optional().default(''),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(10).max(40),
  address: AddressSchema,
  problemDescription: z.string().min(1).max(4000),
  urgency: z.string().max(80).optional().default('normal'),
  preferredSchedule: z.string().max(500).optional().default(''),
  assetCategory: z.string().max(80).optional().default(''),
  assetMake: z.string().max(120).optional().default(''),
  assetModel: z.string().max(120).optional().default(''),
  serialNumber: z.string().max(120).optional().default(''),
  photos: z.array(z.string().max(2048)).default([]),
});

export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

export const CloseoutPayloadSchema = z.object({
  workNotes: z.string().max(4000).optional().default(''),
  labor: z.array(LaborLineSchema).default([]),
  materials: z.array(MaterialLineSchema).default([]),
  recommendations: z.array(z.string().max(500)).default([]),
  warrantyDays: z.number().int().nonnegative().default(30),
  signatureName: z.string().min(1).max(160),
  beforePhotos: z.array(z.string().max(2048)).default([]),
  afterPhotos: z.array(z.string().max(2048)).default([]),
});

export type CloseoutPayload = z.infer<typeof CloseoutPayloadSchema>;

export function totalJobCostCents(job: Job): number {
  const laborTotal = job.labor.reduce((sum, line) => sum + (line.hours * line.rateCents), 0);
  const materialTotal = job.materials.reduce((sum, line) => sum + (line.quantity * line.unitCostCents), 0);
  const partsTotal = job.parts.reduce((sum, line) => sum + (line.quantity * line.unitCostCents), 0);
  return laborTotal + materialTotal + partsTotal;
}

export function nextStatuses(status: JobStatus): JobStatus[] {
  switch (status) {
    case 'lead': return ['intake', 'cancelled'];
    case 'intake': return ['quoted', 'cancelled'];
    case 'quoted': return ['approved', 'cancelled'];
    case 'approved': return ['assigned', 'cancelled'];
    case 'assigned': return ['in_progress', 'cancelled'];
    case 'in_progress': return ['completed', 'cancelled'];
    case 'completed': return ['closed', 'cancelled'];
    case 'closed': return [];
    case 'cancelled': return [];
    default: return [];
  }
}
