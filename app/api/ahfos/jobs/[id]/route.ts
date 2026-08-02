import { z } from 'zod';
import { authenticated, err, ok, safeJson } from '@/lib/ahfos/api-utils';
import { canAccessJob } from '@/lib/ahfos/auth';
import { AhfosRole, ChecklistItemSchema, Job, JobStatus, JobStatusSchema, LaborLineSchema, MaterialLineSchema, PhotoSchema } from '@/lib/ahfos/schema';
import { appendJobEvent, getJobById, getJobEvents, updateJob } from '@/lib/ahfos/store';

export const runtime = 'nodejs';

const ADMIN_ROLES: AhfosRole[] = ['admin', 'dispatcher', 'project_manager'];

const UpdateJobSchema = z.object({
  status: JobStatusSchema.optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'emergency']).optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
  workNotes: z.string().max(4000).optional(),
  labor: z.array(LaborLineSchema).optional(),
  materials: z.array(MaterialLineSchema).optional(),
  recommendations: z.array(z.string()).optional(),
  beforePhotos: z.array(PhotoSchema).optional(),
  afterPhotos: z.array(PhotoSchema).optional(),
}).strict();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, response } = await authenticated(request);
  if (response) return response;

  const job = await getJobById(id);
  if (!job) return err('Job not found.', 404);
  if (!(await canAccessJob(user, job, ADMIN_ROLES))) return err('Forbidden', 403);

  const events = await getJobEvents(id);
  return ok({ job, events });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, response } = await authenticated(request);
  if (response) return response;

  const job = await getJobById(id);
  if (!job) return err('Job not found.', 404);
  if (!(await canAccessJob(user, job, ADMIN_ROLES))) return err('Forbidden', 403);

  const body = await safeJson(request);
  const parsed = UpdateJobSchema.safeParse(body);
  if (!parsed.success) return err('Invalid update payload.', 400);

  const changes = parsed.data;
  const next: Job = { ...job };

  if (changes.status) {
    const allowed = getAllowedStatuses(job.status, user.roles);
    if (!allowed.includes(changes.status)) return err(`Cannot transition from ${job.status} to ${changes.status}.`, 400);
    next.status = changes.status;
  }

  if (changes.assignedTo !== undefined) next.assignedTo = changes.assignedTo ?? undefined;
  if (changes.priority) next.priority = changes.priority;
  if (changes.checklist) next.checklist = changes.checklist;
  if (changes.workNotes !== undefined) next.workNotes = changes.workNotes;
  if (changes.labor) next.labor = changes.labor;
  if (changes.materials) next.materials = changes.materials;
  if (changes.recommendations) next.recommendations = changes.recommendations;
  if (changes.beforePhotos) next.beforePhotos = changes.beforePhotos;
  if (changes.afterPhotos) next.afterPhotos = changes.afterPhotos;

  next.updatedAt = new Date().toISOString();
  await updateJob(next);

  await appendJobEvent({
    jobId: id,
    type: 'job.updated',
    actorId: user.id,
    actorRole: user.roles[0],
    payload: changes,
    timestamp: new Date().toISOString(),
  });

  return ok({ job: next });
}

function getAllowedStatuses(current: JobStatus, roles: AhfosRole[]): JobStatus[] {
  const admin = roles.some((r) => ADMIN_ROLES.includes(r));
  const technician = roles.includes('technician');

  const map: Record<JobStatus, JobStatus[]> = {
    lead: ['intake', 'cancelled'],
    intake: ['quoted', 'cancelled'],
    quoted: ['approved', 'cancelled'],
    approved: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: ['closed', 'cancelled'],
    closed: [],
    cancelled: [],
  };

  const allowed = [...map[current]];
  if (!admin && !technician) {
    return allowed.filter((s) => !['in_progress', 'completed', 'closed'].includes(s));
  }
  if (!admin && technician) {
    if (current === 'assigned') return ['in_progress'];
    if (current === 'in_progress') return ['completed'];
    return [];
  }
  return allowed;
}
