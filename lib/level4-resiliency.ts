type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type Level4EventStatus =
  | 'queued'
  | 'processing'
  | 'committed'
  | 'degraded_queued'
  | 'dead_letter';

export type Level4ProviderState = 'configured' | 'missing';

export type Level4EventPayload = Record<string, JsonValue>;

export type Level4Event = {
  id: string;
  type: string;
  source: string;
  status: Level4EventStatus;
  payload: Level4EventPayload;
  payloadHash: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  committedAt: string | null;
  lastError: string | null;
  errors: string[];
  deterministicFallback: boolean;
};

export type Level4RuntimeSnapshot = {
  level: 4;
  mode: 'normal' | 'degraded';
  service: 'already-here-context-mesh';
  timestamp: string;
  queueDepth: number;
  deadLetterDepth: number;
  committedCount: number;
  processingCount: number;
  degradedQueuedCount: number;
  lastEventAt: string | null;
  providers: Record<string, Level4ProviderState>;
};

type Level4RuntimeStore = {
  events: Map<string, Level4Event>;
  committedCount: number;
  lastEventAt: string | null;
};

type ExecuteWithLevel4Options<T> = {
  event: Level4Event;
  timeoutMs?: number;
  primary: () => Promise<T>;
  fallback?: (context: { event: Level4Event; error: Error }) => Promise<T> | T;
};

const globalLevel4 = globalThis as typeof globalThis & {
  __alreadyHereLevel4Store?: Level4RuntimeStore;
};

function getStore(): Level4RuntimeStore {
  if (!globalLevel4.__alreadyHereLevel4Store) {
    globalLevel4.__alreadyHereLevel4Store = {
      events: new Map<string, Level4Event>(),
      committedCount: 0,
      lastEventAt: null
    };
  }

  return globalLevel4.__alreadyHereLevel4Store;
}

function nowIso(): string {
  return new Date().toISOString();
}

function stableStringify(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function hashPayload(payload: Level4EventPayload): string {
  const input = stableStringify(payload);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function configured(value: string | undefined): Level4ProviderState {
  return value && value.trim().length > 0 ? 'configured' : 'missing';
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Level-4 primary timed out after ${timeoutMs}ms`)), timeoutMs);

    operation
      .then((result) => resolve(result))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timeout));
  });
}

export function createLevel4Event(input: {
  type: string;
  source: string;
  payload: Level4EventPayload;
  maxAttempts?: number;
}): Level4Event {
  const timestamp = nowIso();
  const payloadHash = hashPayload(input.payload);
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  return {
    id: `L4-${payloadHash}-${random}`,
    type: input.type,
    source: input.source,
    status: 'queued',
    payload: input.payload,
    payloadHash,
    createdAt: timestamp,
    updatedAt: timestamp,
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 3,
    nextAttemptAt: timestamp,
    committedAt: null,
    lastError: null,
    errors: [],
    deterministicFallback: false
  };
}

export function recordLevel4Event(event: Level4Event): Level4Event {
  const store = getStore();
  const timestamp = nowIso();
  const nextEvent = { ...event, updatedAt: timestamp };
  store.events.set(nextEvent.id, nextEvent);
  store.lastEventAt = timestamp;
  return nextEvent;
}

export function getLevel4Event(eventId: string): Level4Event | null {
  return getStore().events.get(eventId) ?? null;
}

export function getLevel4Events(): Level4Event[] {
  return Array.from(getStore().events.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getLevel4RuntimeSnapshot(): Level4RuntimeSnapshot {
  const store = getStore();
  const events = Array.from(store.events.values());
  const queueDepth = events.filter((event) => event.status === 'queued').length;
  const deadLetterDepth = events.filter((event) => event.status === 'dead_letter').length;
  const processingCount = events.filter((event) => event.status === 'processing').length;
  const degradedQueuedCount = events.filter((event) => event.status === 'degraded_queued').length;

  return {
    level: 4,
    mode: queueDepth > 0 || deadLetterDepth > 0 || degradedQueuedCount > 0 ? 'degraded' : 'normal',
    service: 'already-here-context-mesh',
    timestamp: nowIso(),
    queueDepth,
    deadLetterDepth,
    committedCount: store.committedCount,
    processingCount,
    degradedQueuedCount,
    lastEventAt: store.lastEventAt,
    providers: {
      resend: configured(process.env.RESEND_API_KEY),
      dispatchInbox: configured(process.env.DISPATCH_TO_EMAIL),
      formspree: configured(process.env.FORMSPREE_ENDPOINT),
      llmGateway: configured(process.env.GATEWAY_URL),
      groq: configured(process.env.GROQ_API_KEY),
      gemini: configured(process.env.GEMINI_API_KEY),
      profitEngine: configured(process.env.PROFITENGINE_URL)
    }
  };
}

export async function executeWithLevel4Resiliency<T>(options: ExecuteWithLevel4Options<T>): Promise<T> {
  const store = getStore();
  const timeoutMs = options.timeoutMs ?? 20_000;
  let event = recordLevel4Event({ ...options.event, status: 'processing', attempts: options.event.attempts + 1 });

  try {
    const result = await withTimeout(options.primary(), timeoutMs);
    const timestamp = nowIso();
    event = {
      ...event,
      status: 'committed',
      updatedAt: timestamp,
      committedAt: timestamp,
      nextAttemptAt: null,
      lastError: null
    };
    store.events.set(event.id, event);
    store.committedCount += 1;
    store.lastEventAt = timestamp;
    return result;
  } catch (caughtError) {
    const error = normalizeError(caughtError);
    const timestamp = nowIso();
    const exhausted = event.attempts >= event.maxAttempts;
    event = {
      ...event,
      status: exhausted && !options.fallback ? 'dead_letter' : 'degraded_queued',
      updatedAt: timestamp,
      lastError: error.message,
      errors: [...event.errors, error.message],
      deterministicFallback: Boolean(options.fallback),
      nextAttemptAt: new Date(Date.now() + Math.min(60_000, 5_000 * Math.max(1, event.attempts))).toISOString()
    };
    store.events.set(event.id, event);
    store.lastEventAt = timestamp;

    if (!options.fallback) throw error;
    return options.fallback({ event, error });
  }
}

export function serializeFormDataForLevel4(formData: FormData): Level4EventPayload {
  const fields: Record<string, JsonValue> = {};
  const files: JsonValue[] = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      files.push({
        field: key,
        name: value.name,
        type: value.type,
        size: value.size,
        retained: false,
        retentionReason: 'Browser/serverless safe mode stores file metadata only; user must reattach file if primary delivery fails before upload completes.'
      });
    } else {
      fields[key] = value;
    }
  }

  return { fields, files };
}

export function resetLevel4RuntimeForTests(): void {
  globalLevel4.__alreadyHereLevel4Store = {
    events: new Map<string, Level4Event>(),
    committedCount: 0,
    lastEventAt: null
  };
}
