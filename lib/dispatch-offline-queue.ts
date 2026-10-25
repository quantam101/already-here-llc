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

export async function replayDispatchQueue(): Promise<{ attempted: number; replayed: number; remaining: number; deferred: number; dead: number }> {
  const records = readQueue();
  const now = Date.now();
  let attempted = 0;
  let replayed = 0;
  let deferred = 0;
  const remaining: OfflineDispatchRecord[] = [];

  for (const record of records) {
    if (record.status === 'replayed') continue;
    if (record.status === 'dead') {
      remaining.push(record);
      continue;
    }

    if (record.nextAttemptAt && Date.parse(record.nextAttemptAt) > now) {
      deferred += 1;
      remaining.push(record);
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
      remaining.push({
        ...record,
        attempts,
        status: exhausted ? 'dead' : 'failed',
        updatedAt: nowIso(),
        lastError: error instanceof Error ? error.message : 'Replay failed',
        nextAttemptAt: exhausted ? null : new Date(now + nextAttemptDelayMs(attempts)).toISOString()
      });
    }
  }

  writeQueue(remaining);
  return { attempted, replayed, remaining: remaining.filter((r) => r.status !== 'dead').length, deferred, dead: remaining.filter((r) => r.status === 'dead').length };
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
