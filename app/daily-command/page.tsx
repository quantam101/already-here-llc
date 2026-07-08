'use client';

import { useEffect, useMemo, useState } from 'react';

type DailyCommandResponse = {
  ok: boolean;
  zeroDependency: boolean;
  service: string;
  mode: string;
  timestamp: string;
  message: string;
  summary: string;
  status: {
    system: string;
    external: string;
    note: string;
  };
  modeDetail: string;
  queuedActions: string[];
  swarm: {
    engine: string;
    route: string;
    parallelism: number;
    zeroSpend: boolean;
    failover: string;
    description: string;
  };
  superAi?: {
    engine: string;
    controlModel: string;
    route: string;
    zeroSpend: boolean;
    externalActions: string;
    database: string;
    approvalGate: boolean;
    agents: Array<{
      id: string;
      name: string;
      operation: string;
      purpose: string;
      handoffTo: string;
    }>;
    blockedOperations: string[];
  };
  superAiQueue?: {
    summary: string;
    approvalRequired: boolean;
    blockedActions: string[];
    nextAgent: string;
    item?: {
      itemId: string;
      lane: string;
      priority: string;
      estimatedValue: number;
      status: string;
    };
  };
};

type SuperAiApiResponse = {
  ok: boolean;
  operation: string;
  summary: string;
  approvalRequired: boolean;
  blockedActions: string[];
  nextAgent: string;
  item?: {
    itemId: string;
    lane: string;
    priority: string;
    estimatedValue: number;
    status: string;
  };
  agent?: {
    id: string;
    name: string;
    operation: string;
    purpose: string;
    handoffTo: string;
  };
};

const fallbackSuperAi = {
  engine: 'already-here-super-ai-orchestrator',
  controlModel: 'super_ai_runs_one_operation_agents',
  route: 'daily_command_local_runtime',
  zeroSpend: true,
  externalActions: 'blocked_by_default',
  database: 'owned_command_spine',
  approvalGate: true,
  agents: [
    {
      id: 'agent_daily_command_ingest',
      name: 'Daily Command Ingest Agent',
      operation: 'ingest_daily_command_item',
      purpose: 'Ingest one Daily Command item only.',
      handoffTo: 'agent_daily_command_rank'
    },
    {
      id: 'agent_daily_command_rank',
      name: 'Daily Command Rank Agent',
      operation: 'rank_daily_command_item',
      purpose: 'Rank one Daily Command item only.',
      handoffTo: 'agent_daily_command_summary'
    },
    {
      id: 'agent_daily_command_summary',
      name: 'Daily Command Summary Agent',
      operation: 'summarize_daily_command_queue',
      purpose: 'Summarize the Daily Command queue only.',
      handoffTo: 'agent_daily_command_snapshot'
    }
  ],
  blockedOperations: ['restricted_outbound_action']
};

const localResponseFor = (prompt: string): DailyCommandResponse => {
  const normalized = prompt.trim() || 'daily command status';
  const summary = normalized.toLowerCase().includes('status')
    ? 'Local-first daily command is available even when offline. External accelerators are optional.'
    : 'Daily Command answers locally with deterministic intelligence and approval-safe action guidance.';

  return {
    ok: true,
    zeroDependency: true,
    service: 'already-here-daily-command',
    mode: 'offline_survivable',
    timestamp: new Date().toISOString(),
    message: 'Offline fallback engaged. The local command remains available.',
    summary,
    status: {
      system: 'degraded',
      external: 'offline',
      note: 'Offline fallback is handling the request using local intelligence.'
    },
    modeDetail: `Prompt fallback hash ${normalized.length}.`,
    queuedActions: [
      'Queue recommended actions locally for later review',
      'Hold paid or risky outbound actions until approval',
      'Use cached status and local system context only',
      'Route Daily Command items through one-operation Super AI agents'
    ],
    swarm: {
      engine: 'vhll-multi-agent-swarm',
      route: 'local_swarm',
      parallelism: 4,
      zeroSpend: true,
      failover: 'cloud_to_local',
      description: 'Local-first multi-agent swarm. Sandboxed parallel workers run on-box with zero spend; cloud inference stays gated.'
    },
    superAi: fallbackSuperAi,
    superAiQueue: {
      summary: 'Offline Super AI fallback is available with approval gates.',
      approvalRequired: true,
      blockedActions: fallbackSuperAi.blockedOperations,
      nextAgent: 'owner_approval_gate'
    }
  };
};

function createLocalStatus(prompt: string) {
  return prompt.trim().length > 0
    ? `Local command ready. Prompt received: ${prompt.trim()}`
    : 'Local command ready. Enter a prompt to get a helpful local response.';
}

function speakText(message: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(message);
  synthesis.cancel();
  synthesis.speak(utterance);
}

type SpeechRecognitionResultAlternative = {
  transcript: string;
};

type SpeechRecognitionEvent = {
  results: {
    [index: number]: {
      [index: number]: SpeechRecognitionResultAlternative;
    };
  };
};

type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
  onresult?: (event: SpeechRecognitionEvent) => void;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;

  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return win.SpeechRecognition ?? win.webkitSpeechRecognition;
}

export default function DailyCommandPage() {
  const [prompt, setPrompt] = useState('Review system status and local command readiness.');
  const [response, setResponse] = useState<DailyCommandResponse | null>(null);
  const [superAiResponse, setSuperAiResponse] = useState<SuperAiApiResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'offline' | 'ready'>('idle');
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [queuedActions, setQueuedActions] = useState<string[]>([]);

  const helpText = useMemo(() => createLocalStatus(prompt), [prompt]);
  const activeSuperAi = response?.superAi ?? fallbackSuperAi;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // Capability detection must run post-mount to stay hydration-safe (SSR renders false).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceEnabled(Boolean(getSpeechRecognitionConstructor()) && 'speechSynthesis' in window);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/daily-command-sw.js').catch(() => null);
    }

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const handleSubmit = async () => {
    setStatus('fetching');
    try {
      const result = await fetch('/api/daily-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!result.ok) {
        throw new Error('API fetch failed');
      }

      const payload = (await result.json()) as DailyCommandResponse;
      setResponse(payload);
      setSuperAiResponse(payload.superAiQueue ? {
        ok: true,
        operation: 'summarize_daily_command_queue',
        summary: payload.superAiQueue.summary,
        approvalRequired: payload.superAiQueue.approvalRequired,
        blockedActions: payload.superAiQueue.blockedActions,
        nextAgent: payload.superAiQueue.nextAgent,
        item: payload.superAiQueue.item
      } : null);
      setStatus('ready');
      if (online && 'speechSynthesis' in window) {
        speakText(payload.summary);
      }
    } catch {
      const fallback = localResponseFor(prompt);
      setResponse(fallback);
      setSuperAiResponse(fallback.superAiQueue ? {
        ok: true,
        operation: 'summarize_daily_command_queue',
        summary: fallback.superAiQueue.summary,
        approvalRequired: fallback.superAiQueue.approvalRequired,
        blockedActions: fallback.superAiQueue.blockedActions,
        nextAgent: fallback.superAiQueue.nextAgent,
        item: fallback.superAiQueue.item
      } : null);
      setStatus('offline');
      if ('speechSynthesis' in window) {
        speakText(fallback.summary);
      }
    }
  };

  const runSuperAiFlow = async () => {
    setStatus('fetching');
    try {
      const result = await fetch('/api/daily-command/super-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'summarize_daily_command_queue',
          prompt,
          source: 'daily-command-page',
          estimatedValue: prompt.includes('$500') ? 500 : 0
        })
      });

      if (!result.ok) {
        throw new Error('Super AI API fetch failed');
      }

      const payload = (await result.json()) as SuperAiApiResponse;
      setSuperAiResponse(payload);
      setStatus('ready');
    } catch {
      setSuperAiResponse({
        ok: true,
        operation: 'summarize_daily_command_queue',
        summary: 'Local Super AI fallback preserved the Daily Command item for owner review.',
        approvalRequired: true,
        blockedActions: fallbackSuperAi.blockedOperations,
        nextAgent: 'owner_approval_gate'
      });
      setStatus('offline');
    }
  };

  const testApprovalGate = async () => {
    setStatus('fetching');
    try {
      const result = await fetch('/api/daily-command/super-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'evaluate_daily_command_security_gate',
          requestedAction: 'send_email'
        })
      });

      if (!result.ok) {
        throw new Error('Approval gate API fetch failed');
      }

      const payload = (await result.json()) as SuperAiApiResponse;
      setSuperAiResponse(payload);
      setStatus('ready');
    } catch {
      setSuperAiResponse({
        ok: true,
        operation: 'evaluate_daily_command_security_gate',
        summary: 'Restricted action blocked by local fallback approval gate.',
        approvalRequired: true,
        blockedActions: fallbackSuperAi.blockedOperations,
        nextAgent: 'owner_approval_gate'
      });
      setStatus('offline');
    }
  };

  const startSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results?.[0]?.[0]?.transcript;
      if (text) {
        setPrompt(text);
      }
    };

    recognition.start();
  };

  const queueAction = () => {
    setQueuedActions((existing) => [...existing, `Queued manual review for prompt: "${prompt.trim()}" at ${new Date().toLocaleTimeString()}`]);
  };

  return (
    <section className="container-shell py-16 lg:py-24">
      <div className="card p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Daily Command</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Local-first failover command center</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">
              Daily Command now routes command items through the Super AI Orchestrator. Each agent has one operation, and restricted actions remain blocked pending owner approval.
            </p>
          </div>
          <div className="rounded-3xl border border-borderBrand bg-soft px-5 py-4 text-sm text-slate-600">
            <p>Status: {online ? 'Online' : 'Offline'}</p>
            <p>Mode: {response?.mode ?? 'local_first'}</p>
            <p>Speech support: {voiceEnabled ? 'Enabled' : 'Unavailable'}</p>
            <p>Super AI: {activeSuperAi.route}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-4">
            <label className="text-sm font-semibold text-slate-700" htmlFor="daily-command-input">Command prompt</label>
            <textarea
              id="daily-command-input"
              rows={6}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="w-full rounded-3xl border border-borderBrand bg-[#07111f] px-4 py-4 text-sm text-slate-100 outline-none transition focus:border-action"
            />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSubmit} className="link-ring rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy">
                Run Command
              </button>
              <button type="button" onClick={runSuperAiFlow} className="link-ring rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-white hover:border-action hover:text-action">
                Run Super AI
              </button>
              <button type="button" onClick={testApprovalGate} className="link-ring rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-white hover:border-action hover:text-action">
                Test Approval Gate
              </button>
              <button type="button" onClick={queueAction} className="link-ring rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-white hover:border-action hover:text-action">
                Queue Action
              </button>
              <button
                type="button"
                onClick={startSpeechRecognition}
                disabled={!voiceEnabled}
                className="link-ring rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:border-action hover:text-action"
              >
                {listening ? 'Listening...' : 'Use Voice Input'}
              </button>
            </div>
            <p className="text-sm text-slate-500">{helpText}</p>
          </div>

          <div className="space-y-4 rounded-3xl border border-borderBrand bg-[#07111f] p-6">
            <div className="rounded-3xl bg-[#0b1728] p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Response snapshot</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">{status === 'fetching' ? 'Fetching command results...' : status === 'offline' ? 'Offline fallback engaged.' : response ? 'Latest response shown below.' : 'Run a command to see the response.'}</p>
            </div>

            {response ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-borderBrand bg-soft p-5">
                  <p className="text-sm font-semibold text-navy">Summary</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{response.summary}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-borderBrand bg-soft p-5">
                    <p className="text-sm font-semibold text-navy">Message</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{response.message}</p>
                  </div>
                  <div className="rounded-3xl border border-borderBrand bg-soft p-5">
                    <p className="text-sm font-semibold text-navy">Mode detail</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{response.modeDetail}</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-borderBrand bg-soft p-5">
                  <p className="text-sm font-semibold text-navy">Swarm engine</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{response.swarm.description}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div><dt className="font-semibold text-slate-500">Route</dt><dd>{response.swarm.route}</dd></div>
                    <div><dt className="font-semibold text-slate-500">Parallel lanes</dt><dd>{response.swarm.parallelism}</dd></div>
                    <div><dt className="font-semibold text-slate-500">Zero-spend</dt><dd>{response.swarm.zeroSpend ? 'Yes' : 'No'}</dd></div>
                    <div><dt className="font-semibold text-slate-500">Failover</dt><dd>{response.swarm.failover}</dd></div>
                  </dl>
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-borderBrand bg-soft p-5">
              <p className="text-sm font-semibold text-navy">Super AI Orchestrator</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{superAiResponse?.summary ?? response?.superAiQueue?.summary ?? 'Run Super AI to route the current Daily Command item through the one-operation agent chain.'}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div><dt className="font-semibold text-slate-500">Control</dt><dd>{activeSuperAi.controlModel}</dd></div>
                <div><dt className="font-semibold text-slate-500">Database</dt><dd>{activeSuperAi.database}</dd></div>
                <div><dt className="font-semibold text-slate-500">Approval</dt><dd>{superAiResponse?.approvalRequired ?? response?.superAiQueue?.approvalRequired ? 'Required' : 'Ready'}</dd></div>
                <div><dt className="font-semibold text-slate-500">Next agent</dt><dd>{superAiResponse?.nextAgent ?? response?.superAiQueue?.nextAgent ?? 'agent_daily_command_ingest'}</dd></div>
              </dl>
              {superAiResponse?.item ? (
                <p className="mt-3 text-xs leading-6 text-slate-600">Item lane: {superAiResponse.item.lane}. Priority: {superAiResponse.item.priority}. Status: {superAiResponse.item.status}.</p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-borderBrand bg-soft p-5">
              <p className="text-sm font-semibold text-navy">One-operation agents</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                {activeSuperAi.agents.map((agent) => (
                  <li key={agent.id}>{agent.name}: {agent.operation}</li>
                ))}
              </ul>
            </div>

            {response ? (
              <div className="rounded-3xl border border-borderBrand bg-soft p-5">
                <p className="text-sm font-semibold text-navy">Queued actions</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                  {response.queuedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {queuedActions.length > 0 ? (
          <div className="mt-8 rounded-3xl border border-borderBrand bg-soft p-5">
            <p className="text-sm font-semibold text-navy">Local queue</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
              {queuedActions.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
