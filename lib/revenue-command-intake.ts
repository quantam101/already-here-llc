import { createHash } from 'crypto';
import { getRevenueCommandAgents } from './revenue-command-agents';

export type IntakeLane = 'Dispatch' | 'AutoWorks' | 'Hauling' | 'Procurement' | 'Product / Affiliate' | 'AI lead capture';
export type IntakePriority = 'P0' | 'P1' | 'P2';

export interface RevenueIntakeInput {
  source: string;
  fullName: string;
  company: string;
  email: string;
  phone?: string;
  title: string;
  body: string;
  location?: string;
  serviceType?: string;
  ticketNumber?: string;
  requestedWindow?: string;
  estimatedValueCents?: number;
  submittedAt?: string;
}

export interface DatabaseReadyWrite {
  table: string;
  id: string;
  action: 'insert';
  record: Record<string, unknown>;
}

export interface RevenueIntakeProof {
  ok: true;
  service: 'already-here-revenue-command-intake';
  intakeId: string;
  lane: IntakeLane;
  priority: IntakePriority;
  score: number;
  persistedExternally: false;
  externalActions: 'blocked_by_default';
  assignedAgentId: string;
  assignedAgentOperation: string;
  databaseReadyWrites: DatabaseReadyWrite[];
  proofOfWorkSummary: string;
  blockedExternalActions: string[];
  nextLocalActions: string[];
}

const BLOCKED_EXTERNAL_ACTIONS = ['restricted_outbound_action', 'restricted_infrastructure_action', 'restricted_financial_action', 'restricted_credential_action'];

function hashId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function text(input: RevenueIntakeInput): string {
  return `${input.title} ${input.body} ${input.serviceType || ''}`.toLowerCase();
}

export function classifyRevenueIntake(input: RevenueIntakeInput): IntakeLane {
  const value = text(input);
  if (['vin', 'vehicle', 'battery', 'brake', 'starter', 'alternator', 'no-start', 'suspension', 'cooling', 'autoworks'].some((term) => value.includes(term))) return 'AutoWorks';
  if (['haul', 'junk', 'cleanout', 'pickup', 'dump', 'storage', 'trailer'].some((term) => value.includes(term))) return 'Hauling';
  if (['rfq', 'procurement', 'vendor registration', 'bid', 'portal', 'government'].some((term) => value.includes(term))) return 'Procurement';
  if (['affiliate', 'product', 'digital download', 'gumroad', 'payhip', 'fly design'].some((term) => value.includes(term))) return 'Product / Affiliate';
  if (['dispatch', 'network', 'printer', 'wireless', 'pos', 'smart hands', 'field', 'rollout', 'site'].some((term) => value.includes(term))) return 'Dispatch';
  return 'AI lead capture';
}

export function scoreRevenueIntake(input: RevenueIntakeInput, lane: IntakeLane): { priority: IntakePriority; score: number } {
  const value = `${text(input)} ${input.requestedWindow || ''}`;
  let score = 20;
  if (lane === 'Dispatch') score += 25;
  if (lane === 'AutoWorks' || lane === 'Hauling') score += 20;
  if (lane === 'Procurement') score += 15;
  if (['urgent', 'today', 'same-day', 'by noon', 'asap'].some((term) => value.includes(term))) score += 30;
  if (['revenue', '$500', 'paid', 'quote', 'rfq', 'client', 'dispatch'].some((term) => value.includes(term))) score += 20;
  if ((input.estimatedValueCents || 0) >= 50000 || value.includes('$500')) score += 25;
  if (score >= 95) return { priority: 'P0', score };
  if (score >= 55) return { priority: 'P1', score };
  return { priority: 'P2', score };
}

function assignedAgentFor(lane: IntakeLane) {
  const agents = getRevenueCommandAgents();
  return agents.find((agent) => agent.lane === lane) || agents.find((agent) => agent.recordId === 'rcs-002-ai-receptionist') || agents[0];
}

function moduleWrite(lane: IntakeLane, opportunityId: string, contactId: string, submittedAt: string, input: RevenueIntakeInput): DatabaseReadyWrite | null {
  if (lane === 'Dispatch') {
    const id = hashId('dispatch', opportunityId);
    return { table: 'dispatches', id, action: 'insert', record: { id, job_id: hashId('job', opportunityId), dispatch_status: 'queued_for_review', skill_match_score: 0, route_fit_score: 0, created_at: submittedAt, updated_at: submittedAt } };
  }
  if (lane === 'AutoWorks') {
    const id = hashId('vehicle', `${contactId}:${input.body}`);
    return { table: 'vehicles', id, action: 'insert', record: { id, contact_id: contactId, fuel_scope: 'gas_light_duty', photos_json: '[]', created_at: submittedAt, updated_at: submittedAt } };
  }
  if (lane === 'Hauling') {
    const id = hashId('hauling', opportunityId);
    return { table: 'hauling_jobs', id, action: 'insert', record: { id, opportunity_id: opportunityId, pickup_address: input.location || 'needs_review', load_type: 'needs_review', estimated_value_cents: input.estimatedValueCents || 0, status: 'queued_for_review', created_at: submittedAt, updated_at: submittedAt } };
  }
  if (lane === 'Procurement') {
    const id = hashId('procurement', opportunityId);
    return { table: 'procurement_targets', id, action: 'insert', record: { id, organization_id: hashId('org', input.company), target_type: input.serviceType || 'procurement_target', compliance_status: 'needs_review', submission_status: 'blocked_pending_owner_approval', created_at: submittedAt, updated_at: submittedAt } };
  }
  if (lane === 'Product / Affiliate') {
    const id = hashId('product', `${input.company}:${input.title}`);
    return { table: 'products', id, action: 'insert', record: { id, product_name: input.title, product_type: 'proof_lane', proof_status: 'not_proven', price_cents: input.estimatedValueCents || 0, status: 'draft', created_at: submittedAt, updated_at: submittedAt } };
  }
  return null;
}

export function buildRevenueIntakeProof(input: RevenueIntakeInput): RevenueIntakeProof {
  const submittedAt = input.submittedAt || new Date().toISOString();
  const lane = classifyRevenueIntake(input);
  const { priority, score } = scoreRevenueIntake(input, lane);
  const intakeId = hashId('intake', `${input.company}:${input.email}:${input.title}:${submittedAt}`);
  const organizationId = hashId('org', input.company || 'unknown');
  const contactId = hashId('contact', `${organizationId}:${input.email || input.fullName}`);
  const leadId = hashId('lead', `${intakeId}:lead`);
  const opportunityId = hashId('opp', `${leadId}:${lane}`);
  const conversationId = hashId('conversation', leadId);
  const reviewId = hashId('review', opportunityId);
  const agent = assignedAgentFor(lane);
  const aiActionId = hashId('ai_action', `${agent.id}:${opportunityId}`);
  const proofId = hashId('proof', opportunityId);
  const analyticsId = hashId('analytics', intakeId);
  const auditId = hashId('audit', intakeId);

  const writes: DatabaseReadyWrite[] = [
    { table: 'organizations', id: organizationId, action: 'insert', record: { id: organizationId, name: input.company || 'Unknown Organization', organization_type: 'lead_source', source: input.source, service_area: input.location || null, created_at: submittedAt, updated_at: submittedAt } },
    { table: 'contacts', id: contactId, action: 'insert', record: { id: contactId, organization_id: organizationId, full_name: input.fullName || 'Unknown Contact', email: input.email || null, phone: input.phone || null, source: input.source, consent_status: 'unknown', created_at: submittedAt, updated_at: submittedAt } },
    { table: 'leads', id: leadId, action: 'insert', record: { id: leadId, contact_id: contactId, organization_id: organizationId, source_channel: input.source, lane, title: input.title, body: input.body, raw_payload_json: JSON.stringify(input), status: 'new', created_at: submittedAt, updated_at: submittedAt } },
    { table: 'opportunities', id: opportunityId, action: 'insert', record: { id: opportunityId, lead_id: leadId, lane, revenue_lane_supported: lane, estimated_value_cents: input.estimatedValueCents || 0, priority, score, blocker: 'Owner review required before external action.', next_action: 'Review, pass, reply draft, quote draft, schedule draft, or prove locally.', status: 'queued_for_review', recommended_follow_up_date: '2026-06-19', created_at: submittedAt, updated_at: submittedAt } },
    { table: 'conversations', id: conversationId, action: 'insert', record: { id: conversationId, lead_id: leadId, contact_id: contactId, channel: input.source, transcript: input.body, summary: input.title, created_at: submittedAt, updated_at: submittedAt } },
    { table: 'reviews', id: reviewId, action: 'insert', record: { id: reviewId, target_table: 'opportunities', target_id: opportunityId, action: 'review', decision: 'queued', persisted_externally: 0, approval_required: 1, created_at: submittedAt } },
    { table: 'ai_actions', id: aiActionId, action: 'insert', record: { id: aiActionId, agent_id: agent.id, target_table: 'opportunities', target_id: opportunityId, action: agent.operation, result_json: JSON.stringify({ lane, priority, score }), persisted_externally: 0, approval_required: 1, created_at: submittedAt } },
    { table: 'analytics_events', id: analyticsId, action: 'insert', record: { id: analyticsId, source: input.source, module: lane, action: 'intake_captured', target_table: 'opportunities', target_id: opportunityId, conversion_value_cents: input.estimatedValueCents || 0, created_at: submittedAt } },
    { table: 'audit_logs', id: auditId, action: 'insert', record: { id: auditId, actor: 'revenue_command_intake_agent', action: 'capture_intake_local_proof', target_table: 'opportunities', target_id: opportunityId, risk_level: 'medium', allowed: 1, reason: 'Local database-ready proof only. External actions blocked.', created_at: submittedAt } },
    { table: 'proof_of_work', id: proofId, action: 'insert', record: { id: proofId, opportunity_id: opportunityId, module: lane, proof_type: 'intake_to_database_ready_records', evidence_json: JSON.stringify([{ table: 'leads', id: leadId }, { table: 'opportunities', id: opportunityId }, { table: 'ai_actions', id: aiActionId }]), outcome_summary: 'Inbound intake normalized into owned database-ready records and assigned to a one-operation agent.', reusable_product_candidate: 1, created_at: submittedAt, updated_at: submittedAt } }
  ];

  const laneWrite = moduleWrite(lane, opportunityId, contactId, submittedAt, input);
  if (laneWrite) writes.push(laneWrite);

  return { ok: true, service: 'already-here-revenue-command-intake', intakeId, lane, priority, score, persistedExternally: false, externalActions: 'blocked_by_default', assignedAgentId: agent.id, assignedAgentOperation: agent.operation, databaseReadyWrites: writes, proofOfWorkSummary: `${lane} intake normalized into ${writes.length} database-ready write(s), assigned to ${agent.name}, priority ${priority}.`, blockedExternalActions: BLOCKED_EXTERNAL_ACTIONS, nextLocalActions: ['review', 'pass', 'reply_draft_only', 'quote_draft_only', 'schedule_draft_only', 'prove_local_only'] };
}

export function buildRevenueCommandProofDemos(): RevenueIntakeProof[] {
  const submittedAt = '2026-06-18T12:00:00.000Z';
  return [
    buildRevenueIntakeProof({ source: 'demo_dispatch', fullName: 'Demo Operator', company: 'Already Here LLC', email: 'demo@example.invalid', title: 'Urgent same-day dispatch revenue opportunity by noon $500', body: 'Network smart hands dispatch, Phoenix area, same-day revenue target.', location: 'Phoenix, AZ', serviceType: 'Technical field operations', estimatedValueCents: 50000, submittedAt }),
    buildRevenueIntakeProof({ source: 'demo_autoworks', fullName: 'Demo Customer', company: 'Already Here AutoWorks', email: 'autoworks@example.invalid', title: 'No-start gas light-duty vehicle diagnostic with battery test', body: 'Gas passenger vehicle only. VIN and photos required at intake. Excludes diesel and heavy-duty work.', location: 'Mesa, AZ', serviceType: 'AutoWorks diagnostic', estimatedValueCents: 15000, submittedAt }),
    buildRevenueIntakeProof({ source: 'demo_hauling', fullName: 'Demo Hauling Customer', company: 'Local Storage Facility', email: 'hauling@example.invalid', title: 'Storage cleanout haul and route stack opportunity', body: 'Pickup, trailer load, route-fit scoring, same-day cleanout candidate.', location: 'Glendale, AZ', serviceType: 'Hauling cleanout', estimatedValueCents: 25000, submittedAt }),
    buildRevenueIntakeProof({ source: 'demo_procurement', fullName: 'Demo Coordinator', company: 'Enterprise Procurement Target', email: 'procurement@example.invalid', title: 'RFQ vendor registration and project bid review', body: 'Procurement portal review only. No submission without owner approval.', location: 'Arizona', serviceType: 'RFQ procurement target', estimatedValueCents: 100000, submittedAt }),
    buildRevenueIntakeProof({ source: 'demo_product_affiliate', fullName: 'Demo Product Owner', company: 'Digital Product Proof Lane', email: 'product@example.invalid', title: 'Digital download product proof lane', body: 'Product and affiliate attribution proof before external sale automation.', serviceType: 'Digital product proof', estimatedValueCents: 1500000, submittedAt })
  ];
}
