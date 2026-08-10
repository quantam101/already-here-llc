import { createHash } from 'node:crypto';
import { listRecords, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface AnalyticsEventInput {
  source: string;
  module?: string;
  action: string;
  pagePath?: string;
  targetTable?: string;
  targetId?: string;
  leadId?: string;
  opportunityId?: string;
  sessionId?: string;
  conversionValueCents?: number;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface FunnelSourceRow {
  source: string;
  touches: number;
  leads: number;
  opportunities: number;
  paidRevenueCents: number;
  verifiedAiRevenueCents: number;
  conversionRate: number;
  revenuePerOpportunityCents: number;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

function safeSource(value: unknown): string {
  const source = String(value || '').trim().toLowerCase();
  return source || 'unknown';
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<{ ok: boolean; id: string; errors: string[] }> {
  const occurredAt = input.occurredAt || new Date().toISOString();
  const fingerprint = `${input.source}:${input.action}:${input.sessionId || ''}:${input.targetId || input.opportunityId || input.leadId || ''}:${occurredAt}`;
  const id = stableId('analytics', fingerprint);
  const write: DatabaseReadyWrite = {
    table: 'analytics_events',
    id,
    action: 'insert',
    record: {
      id,
      source: safeSource(input.source),
      module: input.module || null,
      action: input.action,
      page_path: input.pagePath || null,
      target_table: input.targetTable || null,
      target_id: input.targetId || null,
      lead_id: input.leadId || null,
      opportunity_id: input.opportunityId || null,
      session_hash: input.sessionId ? createHash('sha256').update(input.sessionId).digest('hex') : null,
      conversion_value_cents: Math.max(0, Math.trunc(input.conversionValueCents || 0)),
      metadata: input.metadata || {},
      created_at: occurredAt,
      updated_at: occurredAt
    }
  };
  const result = await persistDatabaseReadyWrites([write]);
  return { ok: result.errors.length === 0, id, errors: result.errors };
}

function sourceForOpportunity(opportunity: Record<string, unknown>, leads: Map<string, Record<string, unknown>>): string {
  if (opportunity.source_system) return safeSource(opportunity.source_system);
  const leadId = String(opportunity.lead_id || '');
  const lead = leads.get(leadId);
  return safeSource(lead?.source_channel || lead?.source || 'unknown');
}

export function buildAcquisitionFunnel(): { generatedAt: string; totals: FunnelSourceRow; sources: FunnelSourceRow[] } {
  const analytics = listRecords('analytics_events', 5000);
  const leadsList = listRecords('leads', 5000);
  const opportunities = listRecords('opportunities', 5000);
  const revenueEvents = listRecords('revenue_events', 5000);
  const leads = new Map(leadsList.map((lead) => [String(lead.id), lead]));
  const opportunitySource = new Map(opportunities.map((opportunity) => [String(opportunity.id), sourceForOpportunity(opportunity, leads)]));
  const rows = new Map<string, FunnelSourceRow>();

  const ensure = (source: string): FunnelSourceRow => {
    const key = safeSource(source);
    if (!rows.has(key)) {
      rows.set(key, { source: key, touches: 0, leads: 0, opportunities: 0, paidRevenueCents: 0, verifiedAiRevenueCents: 0, conversionRate: 0, revenuePerOpportunityCents: 0 });
    }
    return rows.get(key)!;
  };

  for (const event of analytics) ensure(String(event.source || 'unknown')).touches += 1;
  for (const lead of leadsList) ensure(String(lead.source_channel || lead.source || 'unknown')).leads += 1;
  for (const opportunity of opportunities) ensure(sourceForOpportunity(opportunity, leads)).opportunities += 1;
  for (const event of revenueEvents) {
    const source = opportunitySource.get(String(event.opportunity_id || '')) || safeSource(event.source || 'unknown');
    const row = ensure(source);
    const amount = Math.max(0, Math.trunc(Number(event.amount_cents || 0)));
    if (event.event_type === 'paid') row.paidRevenueCents += amount;
    if (event.event_type === 'verified_ai_attributed_revenue' && event.verification_status === 'verified') row.verifiedAiRevenueCents += amount;
  }

  const sources = [...rows.values()].map((row) => ({
    ...row,
    conversionRate: row.leads > 0 ? Number((row.opportunities / row.leads).toFixed(4)) : 0,
    revenuePerOpportunityCents: row.opportunities > 0 ? Math.round(row.paidRevenueCents / row.opportunities) : 0
  })).sort((a, b) => b.paidRevenueCents - a.paidRevenueCents || b.opportunities - a.opportunities || b.touches - a.touches);

  const totals = sources.reduce<FunnelSourceRow>((sum, row) => ({
    source: 'all',
    touches: sum.touches + row.touches,
    leads: sum.leads + row.leads,
    opportunities: sum.opportunities + row.opportunities,
    paidRevenueCents: sum.paidRevenueCents + row.paidRevenueCents,
    verifiedAiRevenueCents: sum.verifiedAiRevenueCents + row.verifiedAiRevenueCents,
    conversionRate: 0,
    revenuePerOpportunityCents: 0
  }), { source: 'all', touches: 0, leads: 0, opportunities: 0, paidRevenueCents: 0, verifiedAiRevenueCents: 0, conversionRate: 0, revenuePerOpportunityCents: 0 });
  totals.conversionRate = totals.leads > 0 ? Number((totals.opportunities / totals.leads).toFixed(4)) : 0;
  totals.revenuePerOpportunityCents = totals.opportunities > 0 ? Math.round(totals.paidRevenueCents / totals.opportunities) : 0;

  return { generatedAt: new Date().toISOString(), totals, sources };
}
