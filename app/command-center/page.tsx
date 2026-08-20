import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Command Center | Already Here LLC',
};

const sections = [
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
      <p className="muted">Operational hub for agents, workflows, logs, and system configuration.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors">
            <p className="font-semibold text-white">{s.label}</p>
            <p className="mt-1 text-sm text-white/60">{s.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
