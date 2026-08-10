import { getDatabaseHealth, listRecords } from './revenue-command-db';

export interface RevenueCommandDashboard {
  generatedAt: string;
  phoenixDate: string;
  database: {
    durable: boolean;
    driver: string;
    schemaVersion: number;
    recordCount: number;
    warning?: string;
  };
  revenue: {
    paidTodayCents: number;
    verifiedAiAttributedTodayCents: number;
    monthToDateCents: number;
    targetTodayCents: number;
    targetGapCents: number;
  };
  pipeline: {
    opportunities: number;
    open: number;
    p0: number;
    p1: number;
    weightedValueCents: number;
    pendingReview: number;
  };
  operations: {
    dispatchesOpen: number;
    routeStacksDraft: number;
    haulingOpen: number;
    autoworksOpen: number;
    procurementOpen: number;
    productsActive: number;
  };
  ai: {
    actions: number;
    pendingActions: number;
    memoryRecords: number;
    outcomes: number;
    verifiedRevenueOutcomes: number;
  };
  engineering: {
    failingHealthSignals: number;
    securityFindingsOpen: number;
    catchCorrectEvents: number;
    codexEvents: number;
  };
  topOpportunities: Array<Record<string, unknown>>;
}

function phoenixDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Phoenix',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function phoenixMonthKey(value: string | Date): string {
  return phoenixDateKey(value).slice(0, 7);
}

function cents(record: Record<string, unknown>): number {
  const value = Number(record.amount_cents ?? record.payment_amount_cents ?? record.estimated_value_cents ?? 0);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function isOpenStatus(status: unknown): boolean {
  const value = String(status || '').toLowerCase();
  return !['completed', 'paid', 'closed', 'cancelled', 'canceled', 'discarded', 'archived', 'inactive'].includes(value);
}

export function buildRevenueCommandDashboard(now = new Date()): RevenueCommandDashboard {
  const phoenixDate = phoenixDateKey(now);
  const phoenixMonth = phoenixMonthKey(now);
  const revenueEvents = listRecords('revenue_events', 5000);
  const opportunities = listRecords('opportunities', 5000);
  const reviews = listRecords('reviews', 5000);
  const approvalActions = listRecords('approval_actions', 5000);
  const dispatches = listRecords('dispatches', 5000);
  const routeStacks = listRecords('route_stacks', 5000);
  const hauling = listRecords('hauling_jobs', 5000);
  const repairs = listRecords('repair_orders', 5000);
  const vehicles = listRecords('vehicles', 5000);
  const procurement = listRecords('procurement_targets', 5000);
  const products = listRecords('products', 5000);
  const aiActions = listRecords('ai_actions', 5000);
  const aiMemory = listRecords('ai_memory', 5000);
  const outcomes = listRecords('outcomes', 5000);
  const healthSignals = listRecords('system_health_signals', 5000);
  const security = listRecords('security_findings', 5000);
  const catchCorrect = listRecords('catch_correct_events', 5000);
  const codex = listRecords('codex_changelog', 5000);
  const health = getDatabaseHealth();

  const paidTodayCents = revenueEvents
    .filter((event) => event.event_type === 'paid' && phoenixDateKey(String(event.created_at || '')) === phoenixDate)
    .reduce((sum, event) => sum + cents(event), 0);
  const verifiedAiAttributedTodayCents = revenueEvents
    .filter((event) => event.event_type === 'verified_ai_attributed_revenue')
    .filter((event) => event.verification_status === 'verified')
    .filter((event) => phoenixDateKey(String(event.created_at || '')) === phoenixDate)
    .reduce((sum, event) => sum + cents(event), 0);
  const monthToDateCents = revenueEvents
    .filter((event) => phoenixMonthKey(String(event.created_at || '')) === phoenixMonth)
    .filter((event) => ['paid', 'verified_ai_attributed_revenue', 'commission', 'affiliate'].includes(String(event.event_type || '')))
    .reduce((sum, event) => sum + cents(event), 0);

  const openOpportunities = opportunities.filter((opportunity) => isOpenStatus(opportunity.status));
  const weightedValueCents = openOpportunities.reduce((sum, opportunity) => {
    const value = Number(opportunity.estimated_value_cents || 0);
    const score = Math.min(100, Math.max(0, Number(opportunity.score || 50)));
    return sum + Math.round(value * score / 100);
  }, 0);
  const pendingReview = reviews.filter((review) => String(review.decision || '').toLowerCase() === 'queued').length
    + approvalActions.filter((action) => String(action.decision || '').toLowerCase() === 'pending').length;
  const targetTodayCents = 50000;
  const realizedToday = paidTodayCents;

  const topOpportunities = [...openOpportunities]
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || Number(b.estimated_value_cents || 0) - Number(a.estimated_value_cents || 0))
    .slice(0, 10)
    .map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title || opportunity.summary || 'Opportunity',
      lane: opportunity.lane,
      priority: opportunity.priority,
      score: opportunity.score,
      estimated_value_cents: opportunity.estimated_value_cents,
      status: opportunity.status,
      blocker: opportunity.blocker,
      next_action: opportunity.next_action,
      recommended_follow_up_date: opportunity.recommended_follow_up_date
    }));

  return {
    generatedAt: now.toISOString(),
    phoenixDate,
    database: {
      durable: health.durable,
      driver: health.driver,
      schemaVersion: health.schemaVersion,
      recordCount: health.recordCount,
      ...(health.warning ? { warning: health.warning } : {})
    },
    revenue: {
      paidTodayCents,
      verifiedAiAttributedTodayCents,
      monthToDateCents,
      targetTodayCents,
      targetGapCents: Math.max(0, targetTodayCents - realizedToday)
    },
    pipeline: {
      opportunities: opportunities.length,
      open: openOpportunities.length,
      p0: openOpportunities.filter((opportunity) => opportunity.priority === 'P0').length,
      p1: openOpportunities.filter((opportunity) => opportunity.priority === 'P1').length,
      weightedValueCents,
      pendingReview
    },
    operations: {
      dispatchesOpen: dispatches.filter((item) => isOpenStatus(item.dispatch_status || item.status)).length,
      routeStacksDraft: routeStacks.filter((item) => String(item.status || '').toLowerCase() === 'draft').length,
      haulingOpen: hauling.filter((item) => isOpenStatus(item.status)).length,
      autoworksOpen: repairs.filter((item) => isOpenStatus(item.status)).length || vehicles.length,
      procurementOpen: procurement.filter((item) => isOpenStatus(item.submission_status || item.status)).length,
      productsActive: products.filter((item) => !['archived', 'inactive'].includes(String(item.status || '').toLowerCase())).length
    },
    ai: {
      actions: aiActions.length,
      pendingActions: aiActions.filter((item) => !item.outcome_id && Number(item.approval_required ?? 1) === 1).length,
      memoryRecords: aiMemory.length,
      outcomes: outcomes.length,
      verifiedRevenueOutcomes: outcomes.filter((item) => item.verification_status === 'verified' && Number(item.realized_revenue_cents || 0) > 0).length
    },
    engineering: {
      failingHealthSignals: healthSignals.filter((item) => ['failing', 'failed', 'unhealthy'].includes(String(item.status || item.state || '').toLowerCase())).length,
      securityFindingsOpen: security.filter((item) => !['closed', 'resolved', 'remediated'].includes(String(item.status || '').toLowerCase())).length,
      catchCorrectEvents: catchCorrect.length,
      codexEvents: codex.length
    },
    topOpportunities
  };
}
