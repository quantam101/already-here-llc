import { randomUUID } from 'crypto';
import { llmComplete } from '@/lib/llm-gateway';
import { totalJobCostCents } from './schema';
import type {
  Asset,
  ChecklistItem,
  CloseoutPayload,
  Customer,
  Job,
  JobPriority,
  JobStatus,
  KnowledgeEntry,
  LaborLine,
  MaterialLine,
  Photo,
  ServiceRequest,
} from './schema';

export type AgentContext = {
  actorId?: string;
  actorRole?: string;
  customer?: Customer;
  asset?: Asset;
  availableTechnicians?: Array<{ id: string; name: string; skills: string[]; assignedJobCount?: number }>;
};

export type IntakeResult = {
  status: JobStatus;
  priority: JobPriority;
  trade: string;
  skill: string;
  estimatedDurationMinutes: number;
  dispatcherPacket: Job['dispatcherPacket'];
};

const TRADE_KEYWORDS: Record<string, string[]> = {
  'Network': ['network', 'wifi', 'wi-fi', 'ap', 'switch', 'router', 'sd-wan', 'firewall', 'cisco', 'cradlepoint'],
  'POS / Retail': ['pos', 'payment', 'printer', 'kiosk', 'retail', 'store', 'ncr'],
  'Smart Hands': ['smart hands', 'rack', 'stack', 'idrac', 'data center', 'server', 'hpe'],
  'RFID / Asset Tracking': ['rfid', 'barcode', 'asset', 'inventory', 'scanner', 'antenna'],
  'Access Control / CCTV': ['access control', 'camera', 'cctv', 'door', 'badge', 'low voltage'],
  'Healthcare / Medical': ['medical', 'healthcare', 'mckesson', 'ge healthcare', 'equipment', 'calibration'],
  'Infrastructure / Fiber': ['fiber', 'cable', 'low-voltage', 'structured cable', 'rack'],
  'Mobile / Vehicle': ['vehicle', 'mobile', 'mechanic', 'haul', 'junk'],
};

function inferTradeAndSkill(description: string): { trade: string; skill: string } {
  const text = description.toLowerCase();
  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return { trade, skill: keywords[0] };
  }
  return { trade: 'IT Field Service', skill: 'general' };
}

function inferPriority(urgency: string): JobPriority {
  const u = urgency.toLowerCase();
  if (u.includes('emergency') || u.includes('down') || u.includes('outage')) return 'emergency';
  if (u.includes('same day') || u.includes('same-day') || u.includes('sameday') || u.includes('urgent') || u.includes('today') || u.includes('asap')) return 'high';
  if (u.includes('quote') || u.includes('schedule')) return 'normal';
  return 'normal';
}

function estimateDuration(trade: string, description: string): number {
  if (description.toLowerCase().includes('multi-site')) return 480;
  if (trade === 'Smart Hands' || trade === 'Infrastructure / Fiber') return 180;
  if (trade === 'POS / Retail') return 120;
  if (trade === 'RFID / Asset Tracking') return 240;
  return 120;
}

function extractSuggestedParts(description: string): string[] {
  const text = description.toLowerCase();
  const parts: string[] = [];
  const hints = [
    { keyword: 'cable', part: 'Assorted cables and patch cords' },
    { keyword: 'router', part: 'Router / firewall appliance' },
    { keyword: 'switch', part: 'Managed switch' },
    { keyword: 'ap', part: 'Wireless access point' },
    { keyword: 'pos', part: 'POS terminal or payment device' },
    { keyword: 'printer', part: 'Printer or label printer' },
    { keyword: 'rfid', part: 'RFID reader and antennas' },
    { keyword: 'barcode', part: 'Barcode scanner' },
    { keyword: 'camera', part: 'IP camera or CCTV equipment' },
    { keyword: 'server', part: 'Server rails and hardware' },
  ];
  for (const hint of hints) {
    if (text.includes(hint.keyword)) parts.push(hint.part);
  }
  return parts;
}

function extractRiskFlags(description: string): string[] {
  const text = description.toLowerCase();
  const flags: string[] = [];
  if (text.includes('after hours') || text.includes('weekend')) flags.push('After-hours access required');
  if (text.includes('healthcare') || text.includes('controlled access')) flags.push('Controlled-access site');
  if (text.includes('multi-site') || text.includes('nationwide')) flags.push('Multi-site coordination');
  if (text.includes('emergency') || text.includes('down')) flags.push('Urgent response required');
  if (text.includes('data center')) flags.push('Data center safety protocols');
  return flags;
}

async function enrichWithLlm(system: string, user: string): Promise<string | null> {
  try {
    return await llmComplete([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 800);
  } catch {
    return null;
  }
}

export async function intakeAgent(request: ServiceRequest, context?: AgentContext): Promise<IntakeResult> {
  const { trade, skill } = inferTradeAndSkill(request.problemDescription);
  const priority = inferPriority(request.urgency);
  const estimatedDurationMinutes = estimateDuration(trade, request.problemDescription);
  const summaryBase = request.problemDescription.slice(0, 500);

  let summary = summaryBase;
  if (context?.customer?.company) {
    summary = `[${context.customer.company}] ${summary}`;
  }
  if (process.env.AHFOS_ENABLE_LLM === 'true') {
    const llmSummary = await enrichWithLlm(
      'You are an AI intake agent for a field operations platform. Summarize the service request in one sentence and return only the summary.',
      JSON.stringify(request),
    );
    if (llmSummary) summary = llmSummary.slice(0, 500);
  }

  return {
    status: 'intake',
    priority,
    trade,
    skill,
    estimatedDurationMinutes,
    dispatcherPacket: {
      summary,
      suggestedParts: extractSuggestedParts(request.problemDescription),
      suggestedCrew: [skill],
      riskFlags: extractRiskFlags(request.problemDescription),
    },
  };
}

export type DispatchResult = {
  assignedTo?: string;
  assignedToName?: string;
  eta?: string;
  note: string;
};

export async function dispatchAgent(job: Job, context: AgentContext): Promise<DispatchResult> {
  const techs = context.availableTechnicians ?? [];
  if (techs.length === 0) return { note: 'No technicians available for auto-assignment.' };

  const scored = techs.map((tech) => {
    const skillMatch = tech.skills.some((s) => job.skill.toLowerCase().includes(s.toLowerCase())) ? 10 : 0;
    const tradeMatch = tech.skills.some((s) => job.trade.toLowerCase().includes(s.toLowerCase())) ? 5 : 0;
    const load = tech.assignedJobCount ?? 0;
    return { tech, score: skillMatch + tradeMatch - load * 0.5 };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0].tech;

  return {
    assignedTo: top.id,
    assignedToName: top.name,
    eta: `${job.estimatedDurationMinutes + 30} minutes`,
    note: `Auto-assigned to ${top.name} based on skill match and current load.`,
  };
}

export async function technicianAgent(job: Job, context?: AgentContext): Promise<{ checklist: ChecklistItem[] }> {
  const assetCategory = context?.asset?.category;
  const templates: Record<string, string[]> = {
    'Network': ['Verify site access and escort requirements', 'Check router/switch status LEDs', 'Capture before photos', 'Run connectivity tests', 'Document SSID and VLAN', 'Capture after photos'],
    'POS / Retail': ['Confirm site contact and register location', 'Power down terminal safely', 'Install or swap POS hardware', 'Test payment and receipt flow', 'Capture before/after photos'],
    'Smart Hands': ['Verify cabinet/rack location', 'Unpack and inventory hardware', 'Install rails and mount gear', 'Cable and label connections', 'Capture before/after photos'],
    'RFID / Asset Tracking': ['Confirm antenna locations', 'Power cycle reader if needed', 'Capture tag reads and signal map', 'Document asset tags', 'Capture before/after photos'],
    'Access Control / CCTV': ['Verify camera/door locations', 'Check power and network drops', 'Test access events or video feed', 'Document firmware/settings', 'Capture before/after photos'],
    'Healthcare / Medical': ['Confirm clinical escort and PPE', 'Verify equipment model and serial', 'Perform calibration or swap', 'Run device self-test', 'Capture before/after photos'],
  };

  const base = ['Arrive on site and check in with contact', 'Capture before photos', 'Complete scope of work', 'Capture after photos', 'Customer sign-off and closeout'];
  const items = templates[assetCategory ?? job.trade] || templates[job.trade] || base;

  return {
    checklist: items.map((text) => ({
      id: randomUUID(),
      text,
      checked: false,
    })),
  };
}

export type CloseoutResult = {
  status: JobStatus;
  invoice: Job['invoice'];
  review: Job['review'];
  knowledgeEntry: Omit<KnowledgeEntry, 'id' | 'createdAt'>;
  totalCents: number;
  note: string;
};

export async function closeoutAgent(job: Job, payload: CloseoutPayload): Promise<CloseoutResult> {
  const totalCents = totalJobCostCents({ ...job, workNotes: payload.workNotes, labor: payload.labor, materials: payload.materials, parts: job.parts });

  return {
    status: 'completed',
    invoice: { status: 'pending', totalCents },
    review: { status: 'pending' },
    totalCents,
    knowledgeEntry: {
      problem: job.intake.problemDescription.slice(0, 500),
      resolution: payload.workNotes.slice(0, 2000),
      trade: job.trade,
      parts: payload.materials.map((m) => m.description),
      labor: payload.labor.map((l) => l.description),
      timeMinutes: payload.labor.reduce((sum, l) => sum + l.hours * 60, 0) || job.estimatedDurationMinutes,
      costCents: totalCents,
      technicianId: job.assignedTo,
      successRate: 1,
      sourceJobId: job.id,
    },
    note: 'Closeout packet generated. Invoice and review triggers queued.',
  };
}

export type QaResult = {
  score: number;
  missingItems: string[];
};

export function qaAgent(job: Job): QaResult {
  const missingItems: string[] = [];
  let score = 0;

  if (job.beforePhotos.length > 0) score += 15; else missingItems.push('Before photos');
  if (job.afterPhotos.length > 0) score += 15; else missingItems.push('After photos');
  if (job.signature) score += 15; else missingItems.push('Customer signature');
  if (job.workNotes.trim().length >= 20) score += 15; else missingItems.push('Work notes (min 20 characters)');
  if (job.labor.length > 0) score += 10; else missingItems.push('Labor lines');
  if (job.recommendations.length > 0) score += 10; else missingItems.push('Maintenance recommendations');

  if (job.checklist.length === 0) {
    missingItems.push('Safety/work checklist');
  } else {
    const checked = job.checklist.filter((c) => c.checked).length;
    score += Math.round((checked / job.checklist.length) * 20);
    if (checked < job.checklist.length) missingItems.push(`Unchecked checklist items (${job.checklist.length - checked})`);
  }

  return { score: Math.min(100, score), missingItems };
}

export type ManagementReport = {
  generatedAt: string;
  jobCounts: Record<string, number>;
  openJobs: number;
  completedToday: number;
  revenueCents: number;
  averageQaScore: number | null;
  technicianRanking: Array<{ technicianId: string; name: string; completedJobs: number; averageQaScore: number | null }>;
};

export function managementAgent(
  jobs: Job[],
  technicians: Array<{ id: string; name: string }>,
): ManagementReport {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const jobCounts: Record<string, number> = {};
  let revenueCents = 0;
  let completedToday = 0;
  const qaScores: number[] = [];

  for (const job of jobs) {
    jobCounts[job.status] = (jobCounts[job.status] ?? 0) + 1;
    if (['completed', 'closed'].includes(job.status)) {
      revenueCents += job.invoice.totalCents;
      if (job.updatedAt.slice(0, 10) === today) completedToday += 1;
    }
    if (job.qa) qaScores.push(job.qa.score);
  }

  const technicianRanking = technicians
    .map((tech) => {
      const techJobs = jobs.filter((j) => j.assignedTo === tech.id && ['completed', 'closed'].includes(j.status));
      const techQa = techJobs.flatMap((j) => (j.qa ? [j.qa.score] : []));
      return {
        technicianId: tech.id,
        name: tech.name,
        completedJobs: techJobs.length,
        averageQaScore: techQa.length ? Math.round(techQa.reduce((a, b) => a + b, 0) / techQa.length) : null,
      };
    })
    .sort((a, b) => b.completedJobs - a.completedJobs || (b.averageQaScore ?? 0) - (a.averageQaScore ?? 0));

  return {
    generatedAt: now.toISOString(),
    jobCounts,
    openJobs: jobs.filter((j) => !['completed', 'closed', 'cancelled'].includes(j.status)).length,
    completedToday,
    revenueCents,
    averageQaScore: qaScores.length ? Math.round(qaScores.reduce((a, b) => a + b, 0) / qaScores.length) : null,
    technicianRanking,
  };
}

export function buildLaborLine(description: string, hours = 1, rateCents = 12500, technicianId?: string): LaborLine {
  return { id: randomUUID(), description, hours, rateCents, technicianId };
}

export function buildMaterialLine(description: string, quantity = 1, unitCostCents = 0, partNumber = ''): MaterialLine {
  return { id: randomUUID(), description, quantity, unitCostCents, partNumber };
}

export function buildPhoto(url: string, kind: Photo['kind'], uploadedBy: string, caption = ''): Photo {
  return { id: randomUUID(), kind, url, caption, uploadedAt: new Date().toISOString(), uploadedBy };
}

export async function invoiceAgent(job: Job): Promise<Job['invoice']> {
  return { status: 'sent', totalCents: job.invoice.totalCents, sentAt: new Date().toISOString() };
}

export async function reviewAgent(job: Job): Promise<Job['review']> {
  void job;
  return { status: 'sent', sentAt: new Date().toISOString() };
}
