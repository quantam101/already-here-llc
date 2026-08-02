import { randomUUID } from 'crypto';
import { authenticated, err, ok, safeJson } from '@/lib/ahfos/api-utils';
import { intakeAgent } from '@/lib/ahfos/agents';
import {
  AhfosRole,
  AddressSchema,
  Job,
  Photo,
  ServiceRequestSchema,
} from '@/lib/ahfos/schema';
import {
  appendJobEvent,
  createAsset,
  createCustomer,
  createJob,
  getCustomerByUserId,
  getJobs,
  getJobsForCustomer,
  getJobsForTechnician,
} from '@/lib/ahfos/store';

export const runtime = 'nodejs';

const ADMIN_ROLES: AhfosRole[] = ['admin', 'dispatcher', 'project_manager', 'office_manager'];

export async function GET(request: Request) {
  const { user, response } = await authenticated(request);
  if (response) return response;

  let jobs: Job[] = [];
  if (user.roles.some((r) => ADMIN_ROLES.includes(r))) {
    jobs = await getJobs();
  } else if (user.roles.includes('technician')) {
    jobs = await getJobsForTechnician(user.id);
  } else {
    const customer = await getCustomerByUserId(user.id);
    if (customer) jobs = await getJobsForCustomer(customer.id);
  }

  return ok({ jobs: jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
}

export async function POST(request: Request) {
  const { user, response } = await authenticated(request);
  if (response) return response;

  const body = await safeJson(request);
  const parsed = ServiceRequestSchema.safeParse(body);
  if (!parsed.success) return err('Invalid service request.', 400);

  const req = parsed.data;
  const address = AddressSchema.parse(req.address);

  const customer = (await getCustomerByUserId(user.id))
    ?? await createCustomer({
      userId: user.id,
      name: req.name,
      company: req.company,
      phone: req.phone,
      email: req.email,
      addresses: [address],
    });

  const assetIds: string[] = [];
  if (req.assetCategory || req.assetMake || req.assetModel || req.serialNumber) {
    const asset = await createAsset({
      customerId: customer.id,
      category: req.assetCategory,
      make: req.assetMake,
      model: req.assetModel,
      serial: req.serialNumber,
      vin: '',
      assetTag: '',
      history: [],
    });
    assetIds.push(asset.id);
  }

  const intake = await intakeAgent(req, { customer });

  const photos: Photo[] = req.photos.map((url) => ({
    id: randomUUID(),
    kind: 'other',
    url,
    caption: 'Customer intake photo',
    uploadedAt: new Date().toISOString(),
    uploadedBy: user.id,
  } as Photo));

  const job = await createJob({
    status: intake.status,
    priority: intake.priority,
    trade: intake.trade,
    skill: intake.skill,
    estimatedDurationMinutes: intake.estimatedDurationMinutes,
    customerId: customer.id,
    siteId: undefined,
    assetIds,
    intake: {
      requestSource: 'portal',
      problemDescription: req.problemDescription,
      preferredSchedule: req.preferredSchedule,
      urgency: req.urgency,
    },
    dispatcherPacket: intake.dispatcherPacket,
    assignedTo: undefined,
    checklist: [],
    parts: [],
    labor: [],
    materials: [],
    recommendations: [],
    beforePhotos: [],
    afterPhotos: photos,
    workNotes: '',
    warrantyDays: 30,
    invoice: { status: 'pending', totalCents: 0 },
    review: { status: 'pending' },
  });

  await appendJobEvent({
    jobId: job.id,
    type: 'intake.created',
    agent: 'intakeAgent',
    actorId: user.id,
    actorRole: user.roles[0],
    payload: { requestSource: 'portal', priority: intake.priority, trade: intake.trade },
    timestamp: new Date().toISOString(),
  });

  return ok({ job }, { status: 201 });
}
