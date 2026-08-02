import { randomUUID } from 'crypto';
import { z } from 'zod';
import { authenticated, err, ok, safeJson } from '@/lib/ahfos/api-utils';
import { closeoutAgent, dispatchAgent, invoiceAgent, reviewAgent, technicianAgent } from '@/lib/ahfos/agents';
import { CloseoutPayloadSchema, totalJobCostCents } from '@/lib/ahfos/schema';
import { appendJobEvent, createKnowledgeEntry, getJobById, getUsers, updateJob } from '@/lib/ahfos/store';

export const runtime = 'nodejs';

const AgentRequestSchema = z.object({
  agent: z.enum(['dispatch', 'technician', 'closeout', 'invoice', 'review', 'kb']),
  payload: z.record(z.string(), z.unknown()).default({}),
}).strict();

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
    if (!user.roles.some((r) => ['admin', 'dispatcher', 'project_manager'].includes(r))) {
      return err('Only dispatchers can run dispatch agent.', 403);
    }
    const users = await getUsers();
    const technicians = users
      .filter((u) => u.roles.includes('technician'))
      .map((u) => ({ id: u.id, name: u.name, skills: [] }));
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
    if (!user.roles.some((r) => ['admin', 'dispatcher', 'technician', 'project_manager'].includes(r))) {
      return err('Forbidden', 403);
    }
    const { checklist } = await technicianAgent(job);
    job.checklist = checklist;
    job.updatedAt = now;
    await updateJob(job);
    await appendJobEvent({ jobId: id, type: 'agent.technician', agent: 'technicianAgent', actorId: user.id, actorRole: user.roles[0], payload: { checklistCount: checklist.length }, timestamp: now });
    return ok({ checklist, job });
  }

  if (agent === 'closeout') {
    if (!user.roles.some((r) => ['admin', 'dispatcher', 'technician'].includes(r))) {
      return err('Only assigned technicians or dispatchers can close out.', 403);
    }
    const closeoutPayload = CloseoutPayloadSchema.parse(payload);
    const result = await closeoutAgent(job, closeoutPayload);

    job.workNotes = closeoutPayload.workNotes;
    job.labor = closeoutPayload.labor;
    job.materials = closeoutPayload.materials;
    job.recommendations = closeoutPayload.recommendations;
    job.warrantyDays = closeoutPayload.warrantyDays;
    job.signature = { name: closeoutPayload.signatureName, signedAt: now, ip: request.headers.get('x-forwarded-for') || '' };
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
    if (!user.roles.some((r) => ['admin', 'accounting', 'dispatcher'].includes(r))) {
      return err('Forbidden', 403);
    }
    job.invoice = await invoiceAgent(job);
    job.updatedAt = now;
    await updateJob(job);
    await appendJobEvent({ jobId: id, type: 'agent.invoice', agent: 'invoiceAgent', actorId: user.id, actorRole: user.roles[0], payload: job.invoice, timestamp: now });
    return ok({ invoice: job.invoice, job });
  }

  if (agent === 'review') {
    if (!user.roles.some((r) => ['admin', 'sales', 'dispatcher'].includes(r))) {
      return err('Forbidden', 403);
    }
    job.review = await reviewAgent(job);
    job.updatedAt = now;
    await updateJob(job);
    await appendJobEvent({ jobId: id, type: 'agent.review', agent: 'reviewAgent', actorId: user.id, actorRole: user.roles[0], payload: job.review, timestamp: now });
    return ok({ review: job.review, job });
  }

  if (agent === 'kb') {
    if (!user.roles.some((r) => ['admin', 'technician', 'dispatcher'].includes(r))) {
      return err('Forbidden', 403);
    }
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
