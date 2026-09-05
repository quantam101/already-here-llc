import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Command Center | Already Here LLC',
};

const sections = [
  { href: '/command-center/health', label: 'Health & Revenue', description: 'Component health, CI capacity, durable backend status, and the $500/day action queue.' },
  { href: '/command-center/agents', label: 'Agents', description: 'Manage and monitor active agents.' },
  { href: '/command-center/approvals', label: 'Approvals', description: 'Review pending approvals.' },
  { href: '/command-center/workflows', label: 'Workflows', description: 'Configure automation workflows.' },
  { href: '/command-center/logs', label: 'Logs', description: 'Runtime and audit logs.' },
  { href: '/command-center/security', label: 'Security', description: 'Access control and security posture.' },
  { href: '/command-center/costs', label: 'Costs', description: 'Spend tracking and budget overview.' },
  { href: '/command-center/connectors', label: 'Connectors', description: 'Manage third-party integrations.' },
  { href: '/command-center/modules', label: 'Modules', description: 'Feature modules and configuration.' },
  { href: '/command-center/codex', label: 'Codex', description: 'Internal knowledge and runbook index.' },
  { href: '/command-center/changelog', label: 'Changelog', description: 'Deployment and release history.' },
];

export default function CommandCenterPage() {
  return (
    <main className="shell">
      <Link className="badge" href="/">Home</Link>
      <h1>Command Center</h1>
      <p className="muted">Operational hub for revenue, system health, agents, workflows, logs, and configuration.</p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="block min-w-0 rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30">
            <p className="font-semibold text-white break-words">{section.label}</p>
            <p className="mt-1 text-sm text-white/60 break-words">{section.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
