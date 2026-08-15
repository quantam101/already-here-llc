import fs from 'node:fs';
import path from 'node:path';
import { canonicalId } from './canonical-ids';
import { type CanonicalStore, getCanonicalStore, resetCanonicalStore } from './canonical-store';

export interface RevenueOSScore {
  total: number;
  speed_to_revenue?: number;
  audience_fit?: number;
  probability_to_convert?: number;
  estimated_margin?: number;
  recurring_potential?: number;
  trust_risk_inverse?: number;
  setup_time_inverse?: number;
  compatibility_with_services?: number;
}

export interface RevenueOSRecord {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  lane: string;
  product_or_offer_name: string;
  company_or_platform: string;
  affiliate_or_sales_path?: string;
  target_buyer?: string;
  pain_solved?: string;
  estimated_commission_or_price?: string;
  cost_required?: string;
  profit_potential?: string;
  time_to_revenue?: string;
  content_angle?: string;
  marketing_channel?: string[];
  stacking_fit?: string;
  risk_flags?: string[];
  recommended_action?: string;
  status: string;
  next_follow_up_date?: string;
  notes?: string;
  approval_required?: boolean;
  score: RevenueOSScore | number;
  estimated_value: number;
  probability: number;
  tags?: string[];
}

export interface RevenueOSSeedSummary {
  ok: boolean;
  inputPath: string;
  recordCount: number;
  opportunityIds: string[];
  counts: Record<string, number>;
  error?: string;
}

function isoNow(): string {
  return new Date().toISOString();
}

function toCents(value: number | string | undefined): number {
  if (typeof value === 'number') return Math.round(value * 100);
  if (typeof value === 'string') {
    const nums = value.match(/[0-9.]+/g);
    if (nums && nums.length > 0) {
      const n = parseFloat(nums[nums.length - 1]);
      if (!Number.isNaN(n)) return Math.round(n * 100);
    }
  }
  return 0;
}

function scoreTotal(score: RevenueOSScore | number | undefined): number {
  if (typeof score === 'number') return score;
  if (score && typeof score === 'object' && 'total' in score) return score.total;
  return 50;
}

function mapStatus(status: string): string {
  switch (status) {
    case 'approval_required':
      return 'queued_for_review';
    case 'drafted':
      return 'draft';
    case 'build':
      return 'building';
    case 'live':
      return 'active';
    default:
      return status || 'seed';
  }
}

function priorityFromScore(score: number): string {
  if (score >= 85) return 'P0';
  if (score >= 55) return 'P1';
  return 'P2';
}

export function buildRevenueOSWrites(record: RevenueOSRecord, now: string) {
  const company = (record.company_or_platform || 'Unknown Organization').trim();
  const source = record.source || 'revenue-os-seed';
  const lane = record.lane || 'unknown';

  const organizationId = canonicalId('org', company);
  const contactId = canonicalId('contact', organizationId, source);
  const leadId = canonicalId('lead', contactId, record.id);
  const opportunityId = canonicalId('opp', leadId, lane, record.id);
  const reviewId = canonicalId('review', opportunityId);
  const aiActionId = canonicalId('ai_action', 'revenue_os_seed', opportunityId);
  const proofId = canonicalId('proof', opportunityId);
  const analyticsId = canonicalId('analytics', opportunityId);
  const auditId = canonicalId('audit', opportunityId);

  const score = scoreTotal(record.score);
  const estimatedCents = toCents(record.estimated_value);

  const writes = [
    {
      table: 'organizations',
      id: organizationId,
      action: 'insert' as const,
      record: {
        id: organizationId,
        name: company,
        organization_type: 'revenue_os_seed',
        source,
        created_at: record.created_at || now,
        updated_at: record.updated_at || now,
      },
    },
    {
      table: 'contacts',
      id: contactId,
      action: 'insert' as const,
      record: {
        id: contactId,
        organization_id: organizationId,
        full_name: 'Revenue OS Seed',
        source,
        consent_status: 'unknown',
        created_at: record.created_at || now,
        updated_at: record.updated_at || now,
      },
    },
    {
      table: 'leads',
      id: leadId,
      action: 'insert' as const,
      record: {
        id: leadId,
        contact_id: contactId,
        organization_id: organizationId,
        source_channel: 'revenue_os_seed',
        lane,
        title: record.product_or_offer_name,
        body: [record.pain_solved, record.recommended_action, record.notes]
          .filter(Boolean)
          .join(' '),
        raw_payload_json: JSON.stringify(record),
        status: 'seed',
        created_at: record.created_at || now,
        updated_at: record.updated_at || now,
      },
    },
    {
      table: 'opportunities',
      id: opportunityId,
      action: 'insert' as const,
      record: {
        id: opportunityId,
        lead_id: leadId,
        lane,
        revenue_lane_supported: lane,
        estimated_value_cents: estimatedCents,
        priority: priorityFromScore(score),
        score,
        probability: record.probability ?? 0.5,
        status: mapStatus(record.status),
        blocker: (record.risk_flags || []).join('; ') || 'Owner review required before external action.',
        next_action: record.recommended_action || 'Review, pass, reply draft, quote draft, schedule draft, or prove locally.',
        tags: record.tags || [],
        recommended_follow_up_date: record.next_follow_up_date || null,
        created_at: record.created_at || now,
        updated_at: record.updated_at || now,
      },
    },
    {
      table: 'reviews',
      id: reviewId,
      action: 'insert' as const,
      record: {
        id: reviewId,
        target_table: 'opportunities',
        target_id: opportunityId,
        action: record.approval_required ? 'reply' : 'pass',
        decision: record.approval_required ? 'pending' : 'passed',
        approval_required: record.approval_required ? 1 : 0,
        persisted_externally: 0,
        created_at: now,
        updated_at: now,
      },
    },
    {
      table: 'ai_actions',
      id: aiActionId,
      action: 'insert' as const,
      record: {
        id: aiActionId,
        agent_id: 'revenue_os_seed',
        target_table: 'opportunities',
        target_id: opportunityId,
        action: 'seed',
        recommendation: record.recommended_action || 'Seed opportunity from validated Revenue OS records.',
        confidence: record.probability ?? 0.5,
        result_json: JSON.stringify({ score: record.score, estimated_value: record.estimated_value, lane }),
        approval_required: 1,
        persisted_externally: 0,
        created_at: now,
        updated_at: now,
      },
    },
    {
      table: 'proof_of_work',
      id: proofId,
      action: 'insert' as const,
      record: {
        id: proofId,
        opportunity_id: opportunityId,
        module: 'RevenueOS',
        proof_type: 'seed_record',
        evidence_json: JSON.stringify([
          { table: 'leads', id: leadId },
          { table: 'opportunities', id: opportunityId },
          { table: 'ai_actions', id: aiActionId },
        ]),
        outcome_summary: `${record.product_or_offer_name} — estimated $${(estimatedCents / 100).toFixed(2)} at probability ${record.probability ?? 0.5}.`,
        reusable_product_candidate: record.tags?.includes('owned') ? 1 : 0,
        created_at: now,
        updated_at: now,
      },
    },
    {
      table: 'analytics_events',
      id: analyticsId,
      action: 'insert' as const,
      record: {
        id: analyticsId,
        source,
        module: 'RevenueOS',
        action: 'seeded',
        target_table: 'opportunities',
        target_id: opportunityId,
        conversion_value_cents: estimatedCents,
        created_at: now,
      },
    },
    {
      table: 'audit_logs',
      id: auditId,
      action: 'insert' as const,
      record: {
        id: auditId,
        actor: 'revenue-os-seed',
        action: 'seed_opportunity',
        target_table: 'opportunities',
        target_id: opportunityId,
        risk_level: 'low',
        allowed: 1,
        reason: 'Validated Revenue OS opportunity record ingested into canonical graph.',
        created_at: now,
      },
    },
  ];

  return { opportunityId, writes };
}

export async function seedRevenueOS(options: {
  inputPath?: string;
  dbPath?: string;
  dryRun?: boolean;
  store?: CanonicalStore;
} = {}): Promise<RevenueOSSeedSummary> {
  const inputPath = options.inputPath || path.join(process.cwd(), 'data', 'revenue-pipeline.json');
  const now = isoNow();

  if (!fs.existsSync(inputPath)) {
    return { ok: false, inputPath, recordCount: 0, opportunityIds: [], counts: {}, error: `Input not found: ${inputPath}` };
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as { records?: RevenueOSRecord[] };
  const records = raw.records || [];

  let store = options.store;
  if (!store) {
    if (options.dbPath) {
      process.env.CANONICAL_SQLITE_PATH = options.dbPath;
    }
    resetCanonicalStore();
    store = getCanonicalStore();
  }

  const opportunityIds: string[] = [];
  const counts: Record<string, number> = {};

  for (const record of records) {
    const { opportunityId, writes } = buildRevenueOSWrites(record, now);
    if (!options.dryRun) {
      const result = await store!.executeWrites(writes);
      if (!result.ok) {
        return { ok: false, inputPath, recordCount: records.length, opportunityIds, counts, error: 'Write failed' };
      }
    }
    opportunityIds.push(opportunityId);
    for (const write of writes) {
      counts[write.table] = (counts[write.table] || 0) + 1;
    }
  }

  return { ok: true, inputPath, recordCount: records.length, opportunityIds, counts };
}
