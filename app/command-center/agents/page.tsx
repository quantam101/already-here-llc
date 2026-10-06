import type { Metadata } from 'next';
import Link from 'next/link';
import { getAgentFleet, getFleetSummary, verifyAgentFleet } from '@/lib/agent-fleet';

export const metadata: Metadata = {
  title: 'Agent Fleet',
  description: 'Specialized agents deployed across every repo with their own prompt, tools, skills, budget, and threads.',
  alternates: { canonical: '/command-center/agents' }
};

export const dynamic = 'force-dynamic';

export default function AgentFleetPage() {
  const summary = getFleetSummary();
  const agents = getAgentFleet();
  const verification = verifyAgentFleet();

  const headline: Array<[string, string | number]> = [
    ['Agents', summary.agentCount],
    ['Threads', summary.threadCount],
    ['Repos', summary.repoCount],
    ['Spend cap', `$${summary.maxCostUsd}`],
    ['Runs per day', summary.maxRunsPerDay],
    ['Checks passed', `${verification.passed}/${verification.checks.length}`]
  ];

  return (
    <div className="container-shell py-16 lg:py-24">
      <Link className="eyebrow" href="/">Command center</Link>
      <h1 className="section-title mt-5">Agent fleet</h1>
      <p className="section-copy">
        Every agent owns one repo lane and carries its own prompt, tool grant, skill set, and hard budget. Threads are the
        recurring units of work each agent runs. All budgets are capped at $0 under strict zero spend; paid adapters stay
        disabled and outbound actions stay behind the approval gate.
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {headline.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-borderBrand bg-soft p-5 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-action">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-white">Functional verification</h2>
        <p className="mt-2 text-sm text-slate-400">
          {verification.ok
            ? 'All fleet invariants hold as of this request.'
            : `${verification.failed} invariant(s) failing. Fix before dispatching work.`}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {verification.checks.map((item) => (
            <li key={item.id} className="rounded-xl border border-borderBrand bg-soft px-4 py-3 text-sm">
              <span className={item.ok ? 'font-semibold text-action' : 'font-semibold text-red-400'}>
                {item.ok ? 'PASS' : 'FAIL'}
              </span>{' '}
              <span className="text-slate-200">{item.description}</span>
              <span className="block text-xs text-slate-400">{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-white">Deployment by repo</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summary.repos.map((repo) => (
            <div key={repo.repo} className="rounded-2xl border border-borderBrand bg-soft p-5">
              <p className="font-semibold text-white">{repo.repo}</p>
              <p className="mt-2 text-sm text-slate-300">
                {repo.agentCount} agents · {repo.threadCount} threads · {repo.highRiskAgents} high risk
              </p>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">{repo.lanes.join(' · ')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-white">Agents</h2>
        <div className="mt-4 space-y-4">
          {agents.map((agent) => (
            <article key={agent.id} className="rounded-2xl border border-borderBrand bg-soft p-6">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-white">{agent.name}</h3>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  {agent.repo} · {agent.lane} · {agent.riskTier} risk
                </p>
              </header>
              <p className="mt-2 text-sm text-slate-300">{agent.mission}</p>
              <p className="mt-3 text-sm text-slate-400">{agent.prompt}</p>
              <dl className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                <div>
                  <dt className="uppercase tracking-wider text-slate-500">Tools</dt>
                  <dd>{agent.tools.join(', ')}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-slate-500">Skills</dt>
                  <dd>{agent.skills.join(', ')}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-slate-500">Budget</dt>
                  <dd>
                    ${agent.budget.maxCostUsd} · {agent.budget.maxRunsPerDay} runs/day · {agent.budget.maxMinutesPerRun} min/run ·{' '}
                    {agent.budget.maxTokensPerRun.toLocaleString()} tokens/run
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-slate-500">Guardrails</dt>
                  <dd>
                    Blocked: {agent.guardrails.forbiddenActions.join(', ')}. Approval: {agent.guardrails.approvalRequiredActions.join(', ')}.
                    {agent.verifierRequired ? ' Verifier required.' : ''}
                  </dd>
                </div>
              </dl>
              <details className="mt-4">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-slate-400">
                  {agent.threads.length} threads
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {agent.threads.map((thread) => (
                    <li key={thread.id} className="rounded-xl border border-borderBrand bg-black/20 px-4 py-3">
                      <p className="text-slate-200">
                        <span className="font-semibold">{thread.slug}</span>{' '}
                        <span className="text-xs uppercase tracking-wider text-slate-400">{thread.cadence}</span>
                      </p>
                      <p className="text-slate-300">{thread.objective}</p>
                      <p className="text-xs text-slate-400">Success: {thread.successSignal}</p>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
