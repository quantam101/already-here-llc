import {
  ENTERPRISE_OPERATIONS,
  buildEnterpriseItem,
  type EnterpriseOperation,
  type EnterpriseItem,
} from './global-enterprise-orchestrator';
import { llmComplete } from './llm-gateway';

const OPERATION_FOR_LANE: Record<string, EnterpriseOperation> = {
  'Daily Command': 'summarize_daily_command',
  'AI Advisor': 'advise_intake',
  'Field Network': 'sync_field_network',
  'Revenue OS': 'record_revenue_event',
  'Opportunity Intelligence': 'scan_opportunities',
  'Packet Library': 'prepare_packet',
  'Backend Command': 'healthcheck_backend',
  'Lifelong Catch and Correct': 'catch_correct',
  'Enterprise General': 'orchestrate',
};

function deterministicDispatch(
  objective: string,
  estimatedValue = 0,
  source = 'asi-dispatcher'
): { operation: EnterpriseOperation; title: string; body: string; source: string; estimatedValue: number; priority: EnterpriseItem['priority']; lane: string } {
  const item = buildEnterpriseItem({ prompt: objective, estimatedValue, source });
  const lane = item.lane;
  const operation = OPERATION_FOR_LANE[lane] ?? 'orchestrate';
  return {
    operation,
    title: item.title,
    body: item.body,
    source: item.source,
    estimatedValue: item.estimatedValue,
    priority: item.priority,
    lane,
  };
}

const ASI_SYSTEM_PROMPT = `You are the Already Here Global Enterprise ASIOS Super-AI dispatcher.
Your job is to read a high-level business objective and choose the single best enterprise operation to run.

Allowed operations (pick exactly one):
- scan_opportunities: search for procurement, grant, field, or teaming opportunities
- score_opportunity: score a known opportunity for fit/risk
- recommend_next_action: recommend what to do next with an item
- summarize_daily_command: produce the daily command summary/queue
- advise_intake: provide AI advisor intake/help for a user message
- normalize_intake: normalize a raw lead/intake into a canonical record
- sync_field_network: sync field technician, vendor, or dispatch data
- track_revenue: record or update a revenue/CRM event
- record_revenue_event: alias for track_revenue
- prepare_packet: prepare a grant, procurement, or capability packet
- track_funding_sources: track grants, SBIR, funding programs
- healthcheck_backend: run a backend/system healthcheck
- build_proof_packet: build a closeout/proof packet
- draft_outreach: draft an outreach message (no sending)
- evaluate_security_gate: evaluate whether an action is allowed/blocked
- catch_correct: log a correction or proof event
- orchestrate: general super-AI orchestration/fallback

Return ONLY a compact JSON object with no markdown, no explanation, and no commentary. Use this exact shape:
{"operation":"<one of the allowed values>","title":"<short 5-8 word title>","body":"<longer description of the work to perform>"}
If the objective is unclear, choose "orchestrate" and describe the ambiguity in the body.`;

function parseLLMResponse(text: string): { operation: EnterpriseOperation; title: string; body: string } | undefined {
  if (!text) return undefined;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const json = jsonMatch ? jsonMatch[0] : text;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const operation = String(parsed.operation || '');
    if (!ENTERPRISE_OPERATIONS.includes(operation as EnterpriseOperation)) return undefined;
    return {
      operation: operation as EnterpriseOperation,
      title: String(parsed.title || 'ASI dispatched objective'),
      body: String(parsed.body || 'No additional detail provided.'),
    };
  } catch {
    return undefined;
  }
}

export async function dispatchObjective(
  objective: string,
  estimatedValue = 0,
  source = 'asi-dispatcher'
): Promise<{ operation: EnterpriseOperation; title: string; body: string; source: string; estimatedValue: number; priority: EnterpriseItem['priority']; lane: string }> {
  const fallback = deterministicDispatch(objective, estimatedValue, source);

  const providerOutput = await llmComplete(
    [
      { role: 'system', content: ASI_SYSTEM_PROMPT },
      { role: 'user', content: `Objective: ${objective}` },
    ],
    500
  ).catch(() => null);

  const parsed = providerOutput ? parseLLMResponse(providerOutput) : undefined;
  if (parsed) {
    const item = buildEnterpriseItem({
      title: parsed.title,
      body: parsed.body,
      prompt: objective,
      estimatedValue,
      source,
    });
    return {
      operation: parsed.operation,
      title: item.title,
      body: item.body,
      source: item.source,
      estimatedValue: item.estimatedValue,
      priority: item.priority,
      lane: item.lane,
    };
  }

  return fallback;
}
