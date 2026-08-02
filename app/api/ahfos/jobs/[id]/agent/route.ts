import { randomUUID } from 'crypto';
import { z } from 'zod';
import { authenticated, err, ok, safeJson } from '@/lib/ahfos/api-utils';
import { canAccessJob } from '@/lib/ahfos/auth';
import { closeoutAgent, dispatchAgent, invoiceAgent, reviewAgent, technicianAgent } from '@/lib/ahfos/agents';
import { AhfosRole, CloseoutPayloadSchema, JobStatus, totalJobCostCents } from '@/lib/ahfos/schema';
import { appendJobEvent, createKnowledgeEntry, getJobById, getJobs, getUsers, updateJob } from '@/lib/ahfos/store';

export const runtime = 'nodejs';

const AgentRequestSchema = z.object({
  agent: z.enum(['dispatch', 'technician', 'closeout', 'invoice', 'review', 'kb']),
  payload: z.record(z.string(), z.unknown()).default({}),
}).strict();

const DISPATCH_ADMIN_ROLES: AhfosRole[] = ['admin', 'dispatcher', 'project_manager'];
const TECHNICIAN_ROLES: AhfosRole[] = ['admin', 'dispatcher', 'project_manager', 'technician'];
const INVOICE_ROLES: AhfosRole[] = ['admin', 'accounting', 'dispatcher'];
const REVIEW_ROLES: AhfosRole[] = ['admin', 'sales', 'dispatcher'];
const KB_ROLES: AhfosRole[] = ['admin', 'dispatcher', 'project_manager', 'technician'];

function hasRole(user: { roles: string[] }, roles: readonly string[]): boolean {
  return user.roles.some((r) => roles.includes(r));
}

function isInStatus(current: JobStatus, allowed: readonly JobStatus[]): boolean {
  return allowed.includes(current);
}

const DISPATCH_FROM: readonly JobStatus[] = ['intake', 'quoted', 'approved', 'assigned'];
const CLOSEOUT_FROM: readonly JobStatus[] = ['assigned', 'in_progress'];
const POST_CLOSE_FROM: readonly JobStatus[] = ['completed', 'closed'];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, response } = await authenticated(request);
  if (response) return response;

  const job = await getJobById(id);
  if (!job) return err('Job not found.', 404);

  const body = await safeJson(request);
  const parsed = AgentRequestSchema.safeParse(body);
  if (!parsed.success) return err('Invalid agent request.', 400);

  const { agent, payload } = parsed.data;
  const now = new Date().toISOString();

  if (agent === 'dispatch') {
    if (!hasRole(user, DISPATCH_ADMIN_ROLES)) return err('Only dispatchers can run dispatch agent.', 403);
    if (!(await canAccessJob(user, job, DISPATCH_ADMIN_ROLES))) return err('Forbidden', 403);
    if (!isInStatus(job.status, DISPATCH_FROM)) return err(`Cannot dispatch a job in ${job.status} status.`, 400);

    const users = await getUsers();
    const allJobs = await getJobs();
    const technicians = users
      .filter((u) => u.roles.includes('technician'))
      .map((u) => ({
        id: u.id,
        name: u.name,
        skills: u.skills,
        assignedJobCount: allJobs.filter((j) => j.assignedTo === u.id && ['assigned', 'in_progress'].includes(j.status)).length,
      }));
    const result = await dispatchAgent(job, { availableTechnicians: technicians, actorId: user.id });
    if (result.assignedTo) {
      job.assignedTo = result.assignedTo;
      job.status = 'assigned';
      job.updatedAt = now;
      await updateJob(job);
      await appendJobEvent({ jobId: id, type: 'agent.dispatch', agent: 'dispatchAgent', actorId: user.id, actorRole: user.roles[0], payload: result, timestamp: now });
      return ok({ result, job });
    }
    return ok({ result });
  }

  if (agent === 'technician') {
    if (!hasRole(user, TECHNICIAN_ROLES)) return err('Forbidden', 403);
    if (!(await canAccessJob(user, job, DISPATCH_ADMIN_ROLES))) return err('Forbidden', 403);
    if (!['assigned', 'in_progress'].includes(job.status)) return err('Checklist can only be built for assigned or in-progress jobs.', 400);

    const asset = undefined;
    const { checklist } = await technicianAgent(job, { asset, actorId: user.id });
    job.checklist = checklist;
    job.updatedAt = now;
    await updateJob(job);
    await appendJobEvent({ jobId: id, type: 'agent.technician', agent: 'technicianAgent', actorId: user.id, actorRole: user.roles[0], payload: { checklistCount: checklist.length }, timestamp: now });
    return ok({ checklist, job });
  }

  if (agent === 'closeout') {
    if (!hasRole(user, TECHNICIAN_ROLES)) return err('Only assigned technicians or dispatchers can close out.', 403);
    if (!(await canAccessJob(user, job, DISPATCH_ADMIN_ROLES))) return err('Forbidden', 403);
    if (!isInStatus(job.status, CLOSEOUT_FROM)) return err(`Cannot close out a job in ${job.status} status.`, 400);

    const closeoutParsed = CloseoutPayloadSchema.safeParse(payload);
    if (!closeoutParsed.success) return err('Invalid closeout payload.', 400);
    const closeoutPayload = closeoutParsed.data;
    const result = await closeoutAgent(job, closeoutPayload);

    job.workNotes = closeoutPayload.workNotes;
    job.labor = closeoutPayload.labor;
    job.materials = closeoutPayload.materials;
    job.recommendations = closeoutPayload.recommendations;
    job.warrantyDays = closeoutPayload.warrantyDays;
    job.signature = { name: closeoutPayload.signatureName, signedAt: now };
    job.status = result.status;
    job.invoice = result.invoice;
    job.review = result.review;

    job.beforePhotos = closeoutPayload.beforePhotos.map((url) => ({
      id: randomUUID(),
      kind: 'before' as const,
      url,
      caption: 'Before work',
      uploadedAt: now,
      uploadedBy: user.id,
    }));
    job.afterPhotos = closeoutPayload.afterPhotos.map((url) => ({
      id: randomUUID(),
      kind: 'after' as const,
      url,
      caption: 'After work',
      uploadedAt: now,
      uploadedBy: user.id,
    }));

    job.invoice.totalCents = totalJobCostCents(job);
    job.updatedAt = now;
    await updateJob(job);

    await appendJobEvent({
      jobId: id,
      type: 'agent.closeout',
      agent: 'closeoutAgent',
      actorId: user.id,
      actorRole: user.roles[0],
      payload: { totalCents: result.totalCents, status: result.status },
      timestamp: now,
    });

    return ok({ result, job });
  }

  if (agent === 'invoice') {
    if (!hasRole(user, INVOICE_ROLES)) return err('Forbidden', 403);
    if (!(await canAccessJob(user, job, DISPATCH_ADMIN_ROLES))) return err('Forbidden', 403);
    if (!isInStatus(job.status, POST_CLOSE_FROM)) return err('Invoice can only be generated for completed or closed jobs.', 400);

    job.invoice = await invoiceAgent(job);
    job.updatedAt = now;
    await updateJob(job);
    await appendJobEvent({ jobId: id, type: 'agent.invoice', agent: 'invoiceAgent', actorId: user.id, actorRole: user.roles[0], payload: job.invoice, timestamp: now });
    return ok({ invoice: job.invoice, job });
  }

  if (agent === 'review') {
    if (!hasRole(user, REVIEW_ROLES)) return err('Forbidden', 403);
    if (!(await canAccessJob(user, job, DISPATCH_ADMIN_ROLES))) return err('Forbidden', 403);
    if (!isInStatus(job.status, POST_CLOSE_FROM)) return err('Review can only be sent for completed or closed jobs.', 400);

    job.review = await reviewAgent(job);
    job.updatedAt = now;
    await updateJob(job);
    await appendJobEvent({ jobId: id, type: 'agent.review', agent: 'reviewAgent', actorId: user.id, actorRole: user.roles[0], payload: job.review, timestamp: now });
    return ok({ review: job.review, job });
  }

  if (agent === 'kb') {
    if (!hasRole(user, KB_ROLES)) return err('Forbidden', 403);
    if (!(await canAccessJob(user, job, DISPATCH_ADMIN_ROLES))) return err('Forbidden', 403);
    if (!isInStatus(job.status, POST_CLOSE_FROM)) return err('Knowledge base entry can only be created for completed or closed jobs.', 400);

    const kb = await createKnowledgeEntry({
      problem: job.intake.problemDescription.slice(0, 500),
      resolution: job.workNotes.slice(0, 2000),
      trade: job.trade,
      parts: job.parts.map((p) => p.description),
      labor: job.labor.map((l) => l.description),
      timeMinutes: job.labor.reduce((s, l) => s + l.hours * 60, 0) || job.estimatedDurationMinutes,
      costCents: totalJobCostCents(job),
      technicianId: job.assignedTo,
      successRate: 1,
      sourceJobId: job.id,
    });
    job.kbEntryId = kb.id;
    job.updatedAt = now;
    await updateJob(job);
    await appendJobEvent({ jobId: id, type: 'agent.kb', agent: 'kbAgent', actorId: user.id, actorRole: user.roles[0], payload: { kbEntryId: kb.id }, timestamp: now });
    return ok({ knowledgeEntry: kb, job });
  }

  return err('Unknown agent.', 400);
}
