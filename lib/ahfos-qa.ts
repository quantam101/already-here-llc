import { getCanonicalStore } from './canonical-store';

type LooseRecord = Record<string, unknown>;

function str(r: LooseRecord | undefined, key: string): string | undefined {
  if (!r) return undefined;
  const v = r[key];
  return typeof v === 'string' ? v : undefined;
}

function num(r: LooseRecord | undefined, key: string): number | undefined {
  if (!r) return undefined;
  const v = r[key];
  return typeof v === 'number' ? v : undefined;
}

export interface QaPacketInput {
  contactId?: string;
  opportunityId?: string;
}

export interface QaPacket {
  ok: boolean;
  contactId?: string;
  organizationId?: string;
  opportunityId?: string;
  customer?: LooseRecord;
  organization?: LooseRecord;
  sites: LooseRecord[];
  equipment: LooseRecord[];
  leads: LooseRecord[];
  opportunities: LooseRecord[];
  haulingJobs: LooseRecord[];
  dispatches: LooseRecord[];
  revenueEvents: LooseRecord[];
  qaScores: LooseRecord[];
  reviews: LooseRecord[];
  aiActions: LooseRecord[];
  auditLogs: LooseRecord[];
  summary: {
    totalOpportunities: number;
    totalRevenueCents: number;
    activeJobs: number;
    averageQaScore: number | null;
    latestQaScore: number | null;
    pendingReviews: number;
    equipmentCount: number;
    siteCount: number;
  };
  error?: string;
}

export function buildQaPacket(input: QaPacketInput): QaPacket {
  const store = getCanonicalStore();

  let opportunity: LooseRecord | undefined;
  let lead: LooseRecord | undefined;
  let contact: LooseRecord | undefined;
  let organization: LooseRecord | undefined;

  if (input.opportunityId) {
    opportunity = store.getRecord('opportunities', input.opportunityId) as LooseRecord | undefined;
    if (!opportunity) {
      return { ok: false, error: 'Opportunity not found', summary: emptySummary() } as QaPacket;
    }
    const leadId = str(opportunity, 'lead_id');
    if (leadId) {
      lead = store.getRecord('leads', leadId) as LooseRecord | undefined;
    }
  }

  if (input.contactId) {
    contact = store.getRecord('contacts', input.contactId) as LooseRecord | undefined;
  } else if (lead) {
    const contactId = str(lead, 'contact_id');
    if (contactId) {
      contact = store.getRecord('contacts', contactId) as LooseRecord | undefined;
    }
  }

  if (!contact && !opportunity) {
    return { ok: false, error: 'Provide a contactId or opportunityId', summary: emptySummary() } as QaPacket;
  }

  const organizationId = str(contact, 'organization_id') ?? str(lead, 'organization_id') ?? str(opportunity, 'organization_id');
  if (organizationId) {
    organization = store.getRecord('organizations', organizationId) as LooseRecord | undefined;
  }

  const sites = store.queryTable('sites').filter((r) => str(r as LooseRecord, 'organization_id') === organizationId);
  const equipment = store.queryTable('equipment').filter((r) => str(r as LooseRecord, 'organization_id') === organizationId);
  const leads = store.queryTable('leads').filter(
    (r) => str(r as LooseRecord, 'contact_id') === (input.contactId ?? str(lead, 'id'))
  );
  const leadIds = new Set(leads.map((r) => str(r as LooseRecord, 'id')).filter(Boolean));
  const opportunities = input.opportunityId
    ? [opportunity as LooseRecord]
    : store.queryTable('opportunities').filter((r) => leadIds.has(str(r as LooseRecord, 'lead_id') ?? ''));
  const opportunityIds = new Set(opportunities.map((r) => str(r as LooseRecord, 'id')).filter(Boolean));

  const haulingJobs = store.queryTable('hauling_jobs').filter((r) => opportunityIds.has(str(r as LooseRecord, 'opportunity_id') ?? ''));
  const dispatches = store.queryTable('dispatches').filter((r) => {
    const rec = r as LooseRecord;
    const jobId = str(rec, 'job_id');
    const oppId = str(rec, 'opportunity_id');
    return (jobId && haulingJobs.some((j) => str(j as LooseRecord, 'id') === jobId)) || (oppId && opportunityIds.has(oppId));
  });
  const revenueEvents = store.queryTable('revenue_events').filter((r) => opportunityIds.has(str(r as LooseRecord, 'opportunity_id') ?? ''));
  const qaScores = store.queryTable('qa_scores').filter((r) => opportunityIds.has(str(r as LooseRecord, 'opportunity_id') ?? ''));
  const reviews = store.queryTable('reviews').filter((r) => opportunityIds.has(str(r as LooseRecord, 'target_id') ?? ''));
  const aiActions = store.queryTable('ai_actions').filter((r) => opportunityIds.has(str(r as LooseRecord, 'target_id') ?? ''));
  const auditLogs = store.queryTable('audit_logs').filter((r) => opportunityIds.has(str(r as LooseRecord, 'target_id') ?? ''));

  const qaScoreValues = qaScores.map((r) => num(r as LooseRecord, 'score')).filter((v): v is number => v !== undefined);
  let totalRevenueCents = revenueEvents.reduce((sum, r) => sum + (num(r as LooseRecord, 'amount_cents') ?? 0), 0);
  if (totalRevenueCents === 0) {
    totalRevenueCents = opportunities.reduce((sum, r) => sum + (num(r as LooseRecord, 'estimated_value_cents') ?? 0), 0);
  }
  const haulingActive = haulingJobs.filter((r) => str(r as LooseRecord, 'status') !== 'closed');
  const dispatchActive = dispatches.filter((r) => {
    const rec = r as LooseRecord;
    return str(rec, 'dispatch_status') !== 'closed' && str(rec, 'status') !== 'closed';
  });
  const activeJobs = new Set([...haulingActive, ...dispatchActive].map((r) => str(r as LooseRecord, 'id')).filter(Boolean)).size;
  const pendingReviews = reviews.filter((r) => str(r as LooseRecord, 'decision') === 'pending').length;

  const summary = {
    totalOpportunities: opportunities.length,
    totalRevenueCents,
    activeJobs,
    averageQaScore: qaScoreValues.length ? qaScoreValues.reduce((a, b) => a + b, 0) / qaScoreValues.length : null,
    latestQaScore: qaScoreValues.length ? qaScoreValues[qaScoreValues.length - 1] : null,
    pendingReviews,
    equipmentCount: equipment.length,
    siteCount: sites.length,
  };

  return {
    ok: true,
    contactId: input.contactId ?? str(contact, 'id'),
    organizationId,
    opportunityId: input.opportunityId ?? str(opportunity, 'id'),
    customer: contact,
    organization,
    sites,
    equipment,
    leads,
    opportunities,
    haulingJobs,
    dispatches,
    revenueEvents,
    qaScores,
    reviews,
    aiActions,
    auditLogs,
    summary,
  };
}

function emptySummary() {
  return {
    totalOpportunities: 0,
    totalRevenueCents: 0,
    activeJobs: 0,
    averageQaScore: null,
    latestQaScore: null,
    pendingReviews: 0,
    equipmentCount: 0,
    siteCount: 0,
  };
}
