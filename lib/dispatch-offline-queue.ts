export type OfflineDispatchRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  maxAttempts: number;
  status: 'queued' | 'replayed' | 'failed' | 'dead';
  endpoint: '/api/dispatch';
  fields: Record<string, string>;
  fileNotice: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
};

const queueKey = 'already_here_dispatch_offline_queue_v1';
const defaultMaxAttempts = 6;
const baseBackoffMs = 30_000;
const maxBackoffMs = 30 * 60_000;

const ulidAlphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeUlidTime(time: number): string {
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    out = ulidAlphabet[time % 32] + out;
    time = Math.floor(time / 32);
  }
  return out;
}

function encodeUlidRandom(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += ulidAlphabet[byte % 32];
  return out;
}

// ULID minted once per user submission intent and resent verbatim on every
// replay, so the server can dedupe retries / double-submits to one dispatch.
export function newDispatchIdempotencyKey(): string {
  return encodeUlidTime(Date.now()) + encodeUlidRandom();
}

function nextAttemptDelayMs(attempts: number): number {
  return Math.min(maxBackoffMs, baseBackoffMs * 2 ** Math.max(0, attempts - 1));
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function nowIso(): string {
  return new Date().toISOString();
}

function readQueue(): OfflineDispatchRecord[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(queueKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineDispatchRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(records: OfflineDispatchRecord[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(queueKey, JSON.stringify(records.slice(-50)));
}

export function queueDispatchSubmission(formData: FormData): OfflineDispatchRecord | null {
  if (!canUseStorage()) return null;

  const fields: Record<string, string> = {};
  let fileNotice: string | null = null;

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      if (value.size > 0) {
        fileNotice = `Attachment ${value.name} was not stored offline. Reattach before final closeout if the server was unavailable.`;
      }
    } else {
      fields[key] = value;
    }
  }

  if (!fields.idempotencyKey) fields.idempotencyKey = newDispatchIdempotencyKey();

  const timestamp = nowIso();
  const record: OfflineDispatchRecord = {
    id: `offline-${timestamp.replace(/[^0-9]/g, '')}-${Math.random().toString(16).slice(2, 10)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    attempts: 0,
    maxAttempts: defaultMaxAttempts,
    status: 'queued',
    endpoint: '/api/dispatch',
    fields,
    fileNotice,
    nextAttemptAt: null,
    lastError: null
  };

  writeQueue([...readQueue(), record]);
  return record;
}

export type ReplayDispatchQueueResult = { attempted: number; replayed: number; remaining: number; deferred: number; dead: number };

let inFlightReplay: Promise<ReplayDispatchQueueResult> | null = null;

function summarizeQueue(records: OfflineDispatchRecord[], attempted: number, replayed: number, deferred: number): ReplayDispatchQueueResult {
  return {
    attempted,
    replayed,
    remaining: records.filter((r) => r.status === 'queued' || r.status === 'failed').length,
    deferred,
    dead: records.filter((r) => r.status === 'dead').length
  };
}

// Merge the processed snapshot back into whatever is in storage now. Records
// enqueued while a replay was awaiting fetch are not part of the snapshot and
// must survive; snapshot records take the processed outcome (or drop out when
// replayed).
function commitReplayOutcome(snapshotIds: Set<string>, processed: Map<string, OfflineDispatchRecord>): OfflineDispatchRecord[] {
  const merged: OfflineDispatchRecord[] = [];
  const seen = new Set<string>();
  for (const current of readQueue()) {
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    if (!snapshotIds.has(current.id)) {
      merged.push(current);
      continue;
    }
    const outcome = processed.get(current.id);
    if (outcome) merged.push(outcome);
  }
  writeQueue(merged);
  return merged;
}

async function runReplay(): Promise<ReplayDispatchQueueResult> {
  const records = readQueue();
  const now = Date.now();
  let attempted = 0;
  let replayed = 0;
  let deferred = 0;
  const snapshotIds = new Set(records.map((record) => record.id));
  const processed = new Map<string, OfflineDispatchRecord>();

  for (const record of records) {
    if (record.status === 'replayed') continue;
    if (record.status === 'dead') {
      processed.set(record.id, record);
      continue;
    }

    if (record.nextAttemptAt && Date.parse(record.nextAttemptAt) > now) {
      deferred += 1;
      processed.set(record.id, record);
      continue;
    }

    attempted += 1;

    const formData = new FormData();
    for (const [key, value] of Object.entries(record.fields)) formData.set(key, value);

    try {
      const response = await fetch(record.endpoint, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Replay failed with status ${response.status}`);
      replayed += 1;
    } catch (error) {
      const attempts = record.attempts + 1;
      const maxAttempts = record.maxAttempts ?? defaultMaxAttempts;
      const exhausted = attempts >= maxAttempts;
      processed.set(record.id, {
        ...record,
        attempts,
        status: exhausted ? 'dead' : 'failed',
        updatedAt: nowIso(),
        lastError: error instanceof Error ? error.message : 'Replay failed',
        nextAttemptAt: exhausted ? null : new Date(now + nextAttemptDelayMs(attempts)).toISOString()
      });
    }
  }

  const merged = commitReplayOutcome(snapshotIds, processed);
  return summarizeQueue(merged, attempted, replayed, deferred);
}

// Only one replay runs per page at a time. Overlapping callers (mount effect,
// `online` event, manual retry) share the in-flight pass so a batch is never
// POSTed twice.
export function replayDispatchQueue(): Promise<ReplayDispatchQueueResult> {
  if (inFlightReplay) return inFlightReplay;
  const pending = runReplay().finally(() => {
    if (inFlightReplay === pending) inFlightReplay = null;
  });
  inFlightReplay = pending;
  return pending;
}

export function getDispatchQueueDepth(): number {
  return readQueue().filter((record) => record.status === 'queued' || record.status === 'failed').length;
}

export function getDispatchQueueStats(): { queued: number; dead: number; nextRetryAt: string | null } {
  const records = readQueue().filter((record) => record.status === 'queued' || record.status === 'failed' || record.status === 'dead');
  const pending = records.filter((record) => record.status !== 'dead');
  const nextRetryAt = pending
    .map((record) => record.nextAttemptAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  return { queued: pending.length, dead: records.filter((record) => record.status === 'dead').length, nextRetryAt };
}
