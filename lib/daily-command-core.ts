import crypto from 'crypto';
import { getDailyCommandSuperAiCapability, runDailyCommandSuperAiOperation } from './daily-command-super-ai';

export type DailyCommandMode = 'online_accelerated' | 'local_first' | 'quota_locked' | 'offline_survivable' | 'last_resort_static';

export type SwarmRoute = 'cloud_swarm' | 'local_swarm';

export interface SwarmCapability {
  engine: 'vhll-multi-agent-swarm';
  route: SwarmRoute;
  parallelism: number;
  zeroSpend: boolean;
  failover: 'cloud_to_local';
  description: string;
}

export interface DailyCommandResponse {
  ok: true;
  zeroDependency: true;
  service: 'already-here-daily-command';
  mode: DailyCommandMode;
  timestamp: string;
  message: string;
  summary: string;
  status: {
    system: 'healthy' | 'degraded';
    external: 'available' | 'degraded' | 'offline' | 'quota_locked';
    note: string;
  };
  modeDetail: string;
  queuedActions: string[];
  swarm: SwarmCapability;
  superAi: ReturnType<typeof getDailyCommandSuperAiCapability>;
  superAiQueue: ReturnType<typeof runDailyCommandSuperAiOperation>;
}

export interface EcosystemStatusResponse {
  ok: true;
  service: 'already-here-ecosystem-status';
  mode: DailyCommandMode;
  timestamp: string;
  available: boolean;
  summary: string;
  externalSystems: Record<string, { available: boolean; reason: string }>;
  failures: string[];
}

export function getMode(forceOffline: boolean, quotaLock: boolean): DailyCommandMode {
  if (forceOffline) {
    return 'offline_survivable';
  }
  if (quotaLock) {
    return 'quota_locked';
  }
  return 'local_first';
}

function normalizePrompt(prompt?: string): string {
  if (!prompt || !prompt.trim()) {
    return 'daily command status';
  }
  return prompt.trim();
}

function getPrioritySummary(prompt: string): string {
  const text = prompt.toLowerCase();
  if (text.includes('status') || text.includes('health') || text.includes('system')) {
    return 'The system is operating in local-first mode with degraded external support. Core command capabilities remain available.';
  }
  if (text.includes('revenue') || text.includes('opportunity') || text.includes('bid')) {
    return 'Revenue and opportunity tracking are available locally. External quote or bid submission remains queued until approval.';
  }
  if (text.includes('voice') || text.includes('phone') || text.includes('mobile')) {
    return 'Voice and phone support features are available where browser APIs exist. Text fallback is fully enabled.';
  }
  return 'Daily Command is available locally with fallback intelligence. External acceleration is optional and queued when unavailable.';
}

function buildMessage(mode: DailyCommandMode): string {
  switch (mode) {
    case 'offline_survivable':
      return 'Offline survivable mode is active. Local command answers are available without network access.';
    case 'quota_locked':
      return 'Quota lock is active. All paid and remote services are blocked, but the local command remains responsive.';
    case 'online_accelerated':
      return 'Online accelerated mode is active. External systems are available to supplement local command responses.';
    case 'last_resort_static':
      return 'Last-resort static mode is active. A safe fallback payload is being returned.';
    default:
      return 'Local-first mode is active. Use optional external systems only as accelerators.';
  }
}

function buildStatus(mode: DailyCommandMode) {
  if (mode === 'offline_survivable') {
    return {
      system: 'degraded' as const,
      external: 'offline' as const,
      note: 'Offline mode is active. The local PWA and command center continue to operate.'
    };
  }

  if (mode === 'quota_locked') {
    return {
      system: 'degraded' as const,
      external: 'quota_locked' as const,
      note: 'Quota lock is active. Remote APIs and paid services are blocked.'
    };
  }

  return {
    system: 'healthy' as const,
    external: 'degraded' as const,
    note: 'The local command center is healthy. External systems are optional accelerators.'
  };
}

const SWARM_LOCAL_LANES = 4;
const SWARM_CLOUD_LANES = 8;

export function getSwarmCapability(mode: DailyCommandMode): SwarmCapability {
  const route: SwarmRoute = mode === 'online_accelerated' ? 'cloud_swarm' : 'local_swarm';
  const zeroSpend = route === 'local_swarm';
  return {
    engine: 'vhll-multi-agent-swarm',
    route,
    parallelism: route === 'cloud_swarm' ? SWARM_CLOUD_LANES : SWARM_LOCAL_LANES,
    zeroSpend,
    failover: 'cloud_to_local',
    description: zeroSpend
      ? 'Local-first multi-agent swarm. Sandboxed parallel workers run on-box with zero spend; cloud inference stays gated.'
      : 'Cloud-accelerated multi-agent swarm with automatic fail-over to local sandboxed workers on quota or outage.'
  };
}

function getQueuedActions(): string[] {
  return [
    'Review approval queue for risky outbound actions',
    'Queue next revenue opportunity for manual approval',
    'Hold paid API calls until quota is available',
    'Route Daily Command items through one-operation Super AI agents'
  ];
}

function getExternalSystems(mode: DailyCommandMode): EcosystemStatusResponse['externalSystems'] {
  const online = mode === 'online_accelerated';
  const blocked = mode === 'quota_locked';
  const offline = mode === 'offline_survivable';

  return {
    oci: {
      available: online,
      reason: online ? 'OCI acceleration available.' : offline ? 'OCI offline.' : blocked ? 'OCI blocked by quota lock.' : 'OCI optional.'
    },
    vercel: {
      available: online,
      reason: online ? 'Vercel available.' : offline ? 'Vercel unreachable.' : blocked ? 'Vercel blocked by quota lock.' : 'Vercel optional.'
    },
    github: {
      available: online,
      reason: online ? 'GitHub available.' : offline ? 'GitHub unavailable.' : blocked ? 'GitHub blocked by quota lock.' : 'GitHub optional.'
    },
    openai: {
      available: online,
      reason: online ? 'Remote LLM APIs available.' : offline ? 'OpenAI unavailable.' : blocked ? 'OpenAI blocked by quota lock.' : 'OpenAI optional.'
    },
    twilio: {
      available: online,
      reason: online ? 'Telephony accelerator available.' : offline ? 'Twilio unavailable.' : blocked ? 'Twilio blocked by quota lock.' : 'Twilio optional.'
    }
  };
}

function hashString(value: string): string {
  if (!value) {
    return 'sha256-empty';
  }

  try {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  } catch {
    return `sha256-${value.length}`;
  }
}

export function getDailyCommandResponse(options: { prompt?: string; forceOffline?: boolean; quotaLock?: boolean }): DailyCommandResponse {
  const prompt = normalizePrompt(options.prompt);
  const forceOffline = Boolean(options.forceOffline);
  const quotaLock = Boolean(options.quotaLock);
  const mode = getMode(forceOffline, quotaLock);
  const summary = getPrioritySummary(prompt);
  const superAi = getDailyCommandSuperAiCapability();
  const superAiQueue = runDailyCommandSuperAiOperation({
    operation: 'summarize_daily_command_queue',
    prompt,
    source: 'daily-command-response',
    estimatedValue: prompt.toLowerCase().includes('$500') ? 500 : 0
  });

  return {
    ok: true,
    zeroDependency: true,
    service: 'already-here-daily-command',
    mode,
    timestamp: new Date().toISOString(),
    message: buildMessage(mode),
    summary,
    status: buildStatus(mode),
    modeDetail: `Prompt hash ${hashString(prompt)}. Mode: ${mode}. Super AI route: ${superAi.route}.`,
    queuedActions: getQueuedActions(),
    swarm: getSwarmCapability(mode),
    superAi,
    superAiQueue
  };
}

export function getEcosystemStatusResponse(options: { forceOffline?: boolean; quotaLock?: boolean }): EcosystemStatusResponse {
  const forceOffline = Boolean(options.forceOffline);
  const quotaLock = Boolean(options.quotaLock);
  const mode = getMode(forceOffline, quotaLock);
  const externalSystems = getExternalSystems(mode);
  const available = mode !== 'offline_survivable';

  return {
    ok: true,
    service: 'already-here-ecosystem-status',
    mode,
    timestamp: new Date().toISOString(),
    available,
    summary: mode === 'offline_survivable' ? 'Local ecosystem status is available. Optional external accelerators are unavailable.' : 'Ecosystem status is available. Optional accelerators can supplement when permitted.',
    externalSystems,
    failures: mode === 'offline_survivable' ? ['External network unavailable'] : quotaLock ? ['Paid and remote systems blocked'] : []
  };
}
