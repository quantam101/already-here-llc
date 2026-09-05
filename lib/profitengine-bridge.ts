import { canonicalId } from './canonical-ids';
import { safeCanonicalUpsert } from './canonical-upsert';
import { recordSystemHealthSignal } from './system-health';

export interface ProfitEngineEvent {
  type: 'content' | 'lead' | 'conversion' | 'revenue' | 'proof' | 'health' | 'agent_outcome';
  externalId: string;
  occurredAt: string;
  source: string;
  evidence?: Record<string, unknown>;
  payload: Record<string, unknown>;
}

function assertMeasured(event: ProfitEngineEvent): void {
  const source = event.source.toLowerCase();
  const payloadText = JSON.stringify(event.payload).toLowerCase();
  if (source.includes('mock') || source.includes('synthetic') || payloadText.includes('mock_revenue') || payloadText.includes('fabricated')) {
    throw new Error('Synthetic/fabricated ProfitEngine events are not accepted into the canonical graph');
  }
  if (!event.externalId || !event.occurredAt || !event.source) throw new Error('ProfitEngine event requires externalId, occurredAt, and source');
}

export async function ingestProfitEngineEvent(event: ProfitEngineEvent): Promise<{ table: string; id: string }> {
  assertMeasured(event);
  const source = `profitengine:${event.source}`;
  if (event.type === 'health') {
    const status = String(event.payload.status ?? 'unknown') as 'healthy' | 'degraded' | 'unhealthy' | 'not_configured' | 'unknown';
    const id = await recordSystemHealthSignal({
      source,
      component: String(event.payload.component ?? 'integration'),
      status,
      environment: String(event.payload.environment ?? 'production'),
      message: String(event.payload.message ?? ''),
      failureClass: String(event.payload.failure_class ?? ''),
      recoveryState: String(event.payload.recovery_state ?? ''),
      evidence: event.evidence,
      metrics: typeof event.payload.metrics === 'object' && event.payload.metrics ? event.payload.metrics as Record<string, unknown> : event.payload,
      observedAt: event.occurredAt,
    });
    return { table: 'system_health_signals', id };
  }

  const tableByType: Record<Exclude<ProfitEngineEvent['type'], 'health'>, string> = {
    content: 'content_events',
    lead: 'leads',
    conversion: 'attribution_events',
    revenue: 'revenue_events',
    proof: 'proof_of_work',
    agent_outcome: 'agent_outcomes',
  };
  const table = tableByType[event.type as Exclude<ProfitEngineEvent['type'], 'health'>];
  const id = canonicalId('pe', event.type, event.externalId);
  await safeCanonicalUpsert(table, id, {
    ...event.payload,
    external_id: event.externalId,
    occurred_at: event.occurredAt,
    evidence_json: JSON.stringify(event.evidence ?? {}),
    source,
    measured: true,
  });
  return { table, id };
}
