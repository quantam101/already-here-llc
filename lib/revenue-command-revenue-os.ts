import { createHash } from 'node:crypto';
import { getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface RevenueOsRecord {
  id: string;
  source: string;
  lane: string;
  revenue_play_name: string;
  buyer_type?: string;
  example_target_company_or_market?: string;
  contact_path?: string;
  location?: string;
  pain_solved?: string;
  estimated_ticket_value?: string;
  cost_required?: string;
  profit_potential?: string;
  time_to_revenue?: string;
  recurring_potential?: string;
  stacking_fit?: string;
  startup_requirements?: string;
  first_10_target_strategy?: string;
  risk_flags?: string;
  recommended_action: string;
  status: string;
  next_follow_up_date?: string;
  notes?: string;
  score_inputs?: Record<string, number>;
  opportunity_score: number;
}

export interface RevenueOsImportResult {
  ok: boolean;
  received: number;
  imported: number;
  duplicates: number;
  invalidIds: string[];
  errors: string[];
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

function validRpId(id: string): boolean {
  return /^RP-\d{3}$/.test(id);
}

export function validateRevenueOsRecords(records: RevenueOsRecord[], expectedCount?: number): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const record of records) {
    if (!validRpId(record.id)) errors.push(`Invalid Revenue OS ID: ${record.id}`);
    if (ids.has(record.id)) errors.push(`Duplicate Revenue OS ID: ${record.id}`);
    ids.add(record.id);
    if (!record.source || !record.lane || !record.revenue_play_name || !record.recommended_action || !record.status) errors.push(`Missing required field(s): ${record.id}`);
    if (!Number.isFinite(record.opportunity_score) || record.opportunity_score < 0 || record.opportunity_score > 100) errors.push(`Invalid opportunity score: ${record.id}`);
    if (record.score_inputs) {
      const calculated = Object.values(record.score_inputs).reduce((sum, value) => sum + Number(value || 0), 0);
      if (Math.round(calculated) !== Math.round(record.opportunity_score)) errors.push(`Score mismatch: ${record.id} expected ${calculated} got ${record.opportunity_score}`);
    }
  }
  if (typeof expectedCount === 'number' && records.length !== expectedCount) errors.push(`Expected ${expectedCount} records, received ${records.length}`);
  return errors;
}

export async function importRevenueOsRecords(records: RevenueOsRecord[], options: { expectedCount?: number; importedAt?: string } = {}): Promise<RevenueOsImportResult> {
  const validationErrors = validateRevenueOsRecords(records, options.expectedCount);
  if (validationErrors.length) return { ok: false, received: records.length, imported: 0, duplicates: 0, invalidIds: records.filter((record) => !validRpId(record.id)).map((record) => record.id), errors: validationErrors };
  const importedAt = options.importedAt || new Date().toISOString();
  const writes: DatabaseReadyWrite[] = [];
  let duplicates = 0;

  for (const record of records) {
    const sourceId = stableId('oppsrc', `revenue-os:${record.id}`);
    const opportunityId = stableId('opp', `revenue-os:${record.id}`);
    if (getRecord('opportunity_sources', sourceId) || getRecord('opportunities', opportunityId)) duplicates += 1;
    writes.push({ table: 'opportunity_sources', id: sourceId, action: 'insert', record: {
      id: sourceId,
      opportunity_id: opportunityId,
      source_type: 'revenue_os',
      source_record_id: record.id,
      source_name: record.source,
      source_payload_json: JSON.stringify(record),
      observed_at: importedAt,
      created_at: importedAt,
      updated_at: importedAt
    }});
    writes.push({ table: 'opportunities', id: opportunityId, action: 'insert', record: {
      id: opportunityId,
      lead_id: null,
      source_record_id: record.id,
      lane: record.lane,
      revenue_lane_supported: record.lane,
      title: record.revenue_play_name,
      summary: record.pain_solved || record.notes || '',
      buyer_type: record.buyer_type || null,
      target_market: record.example_target_company_or_market || null,
      contact_path: record.contact_path || null,
      location: record.location || null,
      estimated_ticket_value_text: record.estimated_ticket_value || null,
      cost_required_text: record.cost_required || null,
      recurring_potential: record.recurring_potential || null,
      stacking_fit: record.stacking_fit || null,
      priority: record.opportunity_score >= 85 ? 'P0' : record.opportunity_score >= 65 ? 'P1' : 'P2',
      score: Math.round(record.opportunity_score),
      blocker: record.risk_flags || 'Owner review required before any external action.',
      next_action: record.recommended_action,
      status: 'research_ready_for_review',
      recommended_follow_up_date: record.next_follow_up_date || null,
      created_at: importedAt,
      updated_at: importedAt
    }});
    writes.push({ table: 'opportunity_scores', id: stableId('oppscore', record.id), action: 'insert', record: {
      id: stableId('oppscore', record.id),
      opportunity_id: opportunityId,
      score: Math.round(record.opportunity_score),
      score_inputs_json: JSON.stringify(record.score_inputs || {}),
      source: 'revenue_os',
      created_at: importedAt,
      updated_at: importedAt
    }});
  }

  const result = await persistDatabaseReadyWrites(writes);
  return { ok: result.errors.length === 0, received: records.length, imported: result.errors.length ? 0 : records.length, duplicates, invalidIds: [], errors: result.errors };
}
