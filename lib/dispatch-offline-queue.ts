export type OfflineDispatchRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  status: 'queued' | 'replayed' | 'failed';
  endpoint: '/api/dispatch';
  fields: Record<string, string>;
  fileNotice: string | null;
};

const queueKey = 'already_here_dispatch_offline_queue_v1';

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
    status: 'queued',
    endpoint: '/api/dispatch',
    fields,
    fileNotice
  };

  writeQueue([...readQueue(), record]);
  return record;
}

export async function replayDispatchQueue(): Promise<{ attempted: number; replayed: number; remaining: number }> {
  const records = readQueue();
  let attempted = 0;
  let replayed = 0;
  const remaining: OfflineDispatchRecord[] = [];

  for (const record of records) {
    if (record.status === 'replayed') continue;
    attempted += 1;

    const formData = new FormData();
    for (const [key, value] of Object.entries(record.fields)) formData.set(key, value);

    try {
      const response = await fetch(record.endpoint, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Replay failed');
      replayed += 1;
    } catch {
      remaining.push({
        ...record,
        attempts: record.attempts + 1,
        status: 'failed',
        updatedAt: nowIso()
      });
    }
  }

  writeQueue(remaining);
  return { attempted, replayed, remaining: remaining.length };
}

export function getDispatchQueueDepth(): number {
  return readQueue().filter((record) => record.status !== 'replayed').length;
}
