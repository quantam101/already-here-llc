import { canonicalId } from './canonical-ids';
import { getCanonicalStore } from './canonical-store';

export interface CodexEventInput {
  source: string;
  module: string;
  changeType: string;
  description: string;
  status?: string;
  evidence?: Record<string, unknown>;
}

export interface CatchCorrectInput {
  source: string;
  failureType: string;
  evidence: string;
  proposedCorrection: string;
  verificationStatus?: string;
  relatedCodexId?: string;
}

export async function recordCodexEvent(input: CodexEventInput): Promise<string> {
  const now = new Date().toISOString();
  const id = canonicalId('codex', input.source, input.module, input.changeType, now);
  const store = getCanonicalStore();
  await store.executeWrites([
    {
      table: 'codex_changelog',
      id,
      action: 'insert',
      record: {
        id,
        source: input.source,
        module: input.module,
        change_type: input.changeType,
        description: input.description,
        status: input.status || 'open',
        evidence_json: JSON.stringify(input.evidence ?? {}),
        created_at: now,
        updated_at: now,
      },
    },
  ]);
  return id;
}

export async function recordCatchCorrectEvent(input: CatchCorrectInput): Promise<string> {
  const now = new Date().toISOString();
  const id = canonicalId('catchcorrect', input.source, input.failureType, now);
  const store = getCanonicalStore();
  await store.executeWrites([
    {
      table: 'catch_correct_events',
      id,
      action: 'insert',
      record: {
        id,
        source: input.source,
        failure_type: input.failureType,
        evidence: input.evidence,
        proposed_correction: input.proposedCorrection,
        verification_status: input.verificationStatus || 'pending',
        related_codex_id: input.relatedCodexId || null,
        created_at: now,
        updated_at: now,
      },
    },
  ]);
  return id;
}

export async function queryCodexEvents(limit = 100): Promise<Record<string, unknown>[]> {
  return await getCanonicalStore().queryTable('codex_changelog', limit);
}

export async function queryCatchCorrectEvents(limit = 100): Promise<Record<string, unknown>[]> {
  return await getCanonicalStore().queryTable('catch_correct_events', limit);
}
