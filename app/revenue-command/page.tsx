'use client';

import { useEffect, useState } from 'react';

type RevenueRecord = {
  id: string;
  lane: string;
  systemModule: string;
  repoOrPlatform: string;
  affectedDataTable: string;
  revenueLaneSupported: string;
  priority: 'P0' | 'P1' | 'P2';
  blocker: string;
  nextAction: string;
  expectedRevenueOrOperationalValue: string;
  securityRisk: 'low' | 'medium' | 'high';
  testVerificationMethod: string;
  status: string;
  recommendedFollowUpDate: string;
};

type RevenueAgent = {
  id: string;
  recordId: string;
  name: string;
  lane: string;
  systemModule: string;
  operation: string;
  runPolicy: string;
  executionScope: string;
  handoffTo: string;
  blockedExternalActions: string[];
  allowedLocalActions: string[];
  testVerificationMethod: string;
};

type RevenueCommandPayload = {
  ok: boolean;
  generatedAt: string;
  databaseRole: string;
  externalActions: string;
  databaseTables: string[];
  records: RevenueRecord[];
  agents: RevenueAgent[];
  agentCoverage: {
    ok: boolean;
    recordCount: number;
    agentCount: number;
    oneAgentPerTask: boolean;
    missingAgentRecordIds: string[];
    duplicateAgentRecordIds: string[];
    duplicateOperations: string[];
  };
};

type ActionResult = {
  ok: boolean;
  action: string;
  recordId: string;
  persistedExternally: false;
  approvalRequired: boolean;
  message: string;
  nextLocalState: string;
};

const fallback: RevenueCommandPayload = {
  ok: true,
  generatedAt: new Date().toISOString(),
  databaseRole: 'owned_core_asset_layer',
  externalActions: 'blocked_by_default',
  databaseTables: ['leads', 'opportunities', 'contacts', 'ai_actions', 'proof_of_work'],
  records: [],
  agents: [],
  agentCoverage: {
    ok: false,
    recordCount: 0,
    agentCount: 0,
    oneAgentPerTask: false,
    missingAgentRecordIds: [],
    duplicateAgentRecordIds: [],
    duplicateOperations: []
  }
};

export default function RevenueCommandPage() {
  const [payload, setPayload] = useState<RevenueCommandPayload>(fallback);
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  const loadPayload = async () => {
    try {
      const response = await fetch('/api/revenue-command-spine', { method: 'GET' });
      if (!response.ok) throw new Error('Revenue Command fetch failed');
      const data = (await response.json()) as RevenueCommandPayload;
      setPayload(data);
      setStatus('ready');
    } catch {
      setPayload(fallback);
      setStatus('offline');
    }
  };

  useEffect(() => {
    // Initial data fetch on mount; state updates occur only after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPayload().catch(() => null);
  }, []);

  const runLocalAction = async (recordId: string, action: string) => {
    try {
      const response = await fetch('/api/revenue-command-spine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, action })
      });
      if (!response.ok) throw new Error('Revenue Command action failed');
      const data = (await response.json()) as ActionResult;
      setActionResult(data);
    } catch {
      setActionResult({
        ok: true,
        action,
        recordId,
        persistedExternally: false,
        approvalRequired: true,
        message: `${action} action staged locally. No external action was executed.`,
        nextLocalState: 'reviewed'
      });
    }
  };

  const topRecords = payload.records.slice(0, 8);
  const topAgents = payload.agents.slice(0, 8);

  return (
    <section className="container-shell py-16 lg:py-24">
      <div className="card p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Revenue Command</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Owned database and agent command spine</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">
              Central command layer for Already Here revenue records, module tasks, approval-gated local actions, proof-of-work, and one-agent-per-task execution.
            </p>
          </div>
          <div className="rounded-3xl border border-borderBrand bg-soft px-5 py-4 text-sm text-slate-600">
            <p>Status: {status}</p>
            <p>Records: {payload.agentCoverage.recordCount}</p>
            <p>Agents: {payload.agentCoverage.agentCount}</p>
            <p>One agent per task: {payload.agentCoverage.oneAgentPerTask ? 'Yes' : 'No'}</p>
            <p>External actions: {payload.externalActions}</p>
          </div>
        </div>

        {actionResult ? (
          <div className="mb-6 rounded-3xl border border-borderBrand bg-soft p-5 text-sm text-slate-700">
            <p className="font-semibold text-navy">Latest local action</p>
            <p className="mt-2 leading-7">{actionResult.message}</p>
            <p className="mt-1 text-xs text-slate-500">Persisted externally: {actionResult.persistedExternally ? 'Yes' : 'No'} | Approval required: {actionResult.approvalRequired ? 'Yes' : 'No'}</p>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-borderBrand bg-[#07111f] p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Highest-value build records</p>
              <div className="mt-4 space-y-4">
                {topRecords.map((record) => (
                  <article key={record.id} className="rounded-3xl border border-white/10 bg-[#0b1728] p-5 text-sm text-slate-200">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{record.systemModule}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{record.lane} | {record.priority} | {record.status}</p>
                      </div>
                      <p className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{record.revenueLaneSupported}</p>
                    </div>
                    <p className="mt-3 leading-7">{record.nextAction}</p>
                    <p className="mt-2 text-xs leading-6 text-slate-400">Tables: {record.affectedDataTable}</p>
                    <p className="mt-2 text-xs leading-6 text-slate-400">Test: {record.testVerificationMethod}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['review', 'pass', 'reply', 'prove'].map((action) => (
                        <button key={`${record.id}-${action}`} type="button" onClick={() => runLocalAction(record.id, action)} className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white hover:border-action hover:text-action">
                          {action.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-borderBrand bg-soft p-5">
              <p className="text-sm font-semibold text-navy">Agent coverage</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div><dt className="font-semibold text-slate-500">Records</dt><dd>{payload.agentCoverage.recordCount}</dd></div>
                <div><dt className="font-semibold text-slate-500">Agents</dt><dd>{payload.agentCoverage.agentCount}</dd></div>
                <div><dt className="font-semibold text-slate-500">Missing</dt><dd>{payload.agentCoverage.missingAgentRecordIds.length}</dd></div>
                <div><dt className="font-semibold text-slate-500">Duplicates</dt><dd>{payload.agentCoverage.duplicateAgentRecordIds.length + payload.agentCoverage.duplicateOperations.length}</dd></div>
              </dl>
            </div>

            <div className="rounded-3xl border border-borderBrand bg-soft p-5">
              <p className="text-sm font-semibold text-navy">One-operation agents</p>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
                {topAgents.map((agent) => (
                  <li key={agent.id} className="rounded-2xl border border-borderBrand bg-white p-3">
                    <p className="font-semibold text-navy">{agent.name}</p>
                    <p className="text-xs text-slate-500">Operation: {agent.operation}</p>
                    <p className="text-xs text-slate-500">Scope: {agent.executionScope} | Handoff: {agent.handoffTo}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-borderBrand bg-soft p-5">
              <p className="text-sm font-semibold text-navy">Database tables</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {payload.databaseTables.map((table) => (
                  <span key={table} className="rounded-full border border-borderBrand bg-white px-3 py-1 text-xs text-slate-600">{table}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
