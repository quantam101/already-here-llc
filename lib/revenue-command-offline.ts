export interface OfflineRevenueEvent {
  id: string;
  endpoint: string;
  method: 'POST';
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

const DB_NAME = 'already-here-revenue-command';
const STORE_NAME = 'offline-events';
const DB_VERSION = 1;

function supported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  if (!supported()) return Promise.reject(new Error('IndexedDB unavailable'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open offline queue'));
  });
}

export async function queueOfflineRevenueEvent(event: OfflineRevenueEvent): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Unable to queue offline event'));
  });
  db.close();
}

export async function listOfflineRevenueEvents(): Promise<OfflineRevenueEvent[]> {
  const db = await openDatabase();
  const events = await new Promise<OfflineRevenueEvent[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || []) as OfflineRevenueEvent[]);
    request.onerror = () => reject(request.error || new Error('Unable to read offline queue'));
  });
  db.close();
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function deleteOfflineRevenueEvent(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Unable to remove offline event'));
  });
  db.close();
}

async function incrementAttempt(event: OfflineRevenueEvent): Promise<void> {
  await queueOfflineRevenueEvent({ ...event, attempts: event.attempts + 1 });
}

export async function flushOfflineRevenueEvents(fetchImpl: typeof fetch = fetch): Promise<{ sent: number; remaining: number }> {
  const events = await listOfflineRevenueEvents();
  let sent = 0;
  for (const event of events) {
    try {
      const response = await fetchImpl(event.endpoint, {
        method: event.method,
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': event.id },
        body: JSON.stringify(event.payload),
        credentials: 'same-origin'
      });
      if (!response.ok) {
        await incrementAttempt(event);
        continue;
      }
      await deleteOfflineRevenueEvent(event.id);
      sent += 1;
    } catch {
      await incrementAttempt(event);
    }
  }
  return { sent, remaining: (await listOfflineRevenueEvents()).length };
}

export function makeOfflineEventId(prefix = 'offline'): string {
  const entropy = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${entropy}`;
}
