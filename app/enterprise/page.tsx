import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Enterprise & Global Deployment',
  description: 'Enterprise-grade GINC marketplace deployment with SLA, compliance, global readiness, and dedicated support.',
  alternates: { canonical: '/enterprise' }
};

export default function EnterprisePage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">For Enterprise</span>
      <h1 className="section-title mt-5">Deploy GINC across your organization</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
        Already Here LLC and GINC — Growth & Interconnected Networks Collective — are built for multi-site, multi-region, and multi-stakeholder operations. Connect idle assets, workforce, and project demand on a platform with audit logging, role-based access, and enterprise support.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'SLA-backed uptime', value: '99.9%' },
          { label: 'Support response', value: '< 4 hours' },
          { label: 'Global ready', value: '50-state + international' },
          { label: 'Data residency', value: 'US / EU available' }
        ].map((stat) => (
          <div key={stat.label} className="card p-6 text-center">
            <div className="text-3xl font-bold text-navy">{stat.value}</div>
            <div className="mt-2 text-sm font-medium text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-navy">Compliance & trust</h2>
          <ul className="mt-5 space-y-3 text-sm text-slate-600">
            <li>Privacy Policy, Terms of Service, and GDPR rights pages</li>
            <li>Security headers and CSP on every response</li>
            <li>Redis-backed audit log with automatic retention</li>
            <li>SAM.gov registered and commercially insured operator</li>
            <li>SOC 2 Type II roadmap available on request</li>
          </ul>
        </div>
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-navy">Platform capabilities</h2>
          <ul className="mt-5 space-y-3 text-sm text-slate-600">
            <li>Member profiles with owner, renter, worker, and business roles</li>
            <li>Asset, equipment, vehicle, and space listings</li>
            <li>Work and contract postings with skill matching</li>
            <li>Scored match recommendations across listings, jobs, and members</li>
            <li>Rate limiting, sanitization, and request-level audit events</li>
          </ul>
        </div>
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-navy">Enterprise support</h2>
          <ul className="mt-5 space-y-3 text-sm text-slate-600">
            <li>Dedicated onboarding and training</li>
            <li>Custom integrations and webhooks</li>
            <li>White-label marketplace options</li>
            <li>Multi-region deployment and data residency</li>
            <li>Priority support with defined SLAs</li>
          </ul>
        </div>
      </div>

      <div className="mt-14 card p-8 lg:p-10">
        <h2 className="text-2xl font-semibold text-navy">Pricing overview</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-borderBrand p-6">
            <h3 className="text-lg font-semibold text-navy">Starter</h3>
            <p className="mt-2 text-sm text-slate-600">For local operators and small fleets.</p>
            <p className="mt-4 text-2xl font-bold text-navy">Free to list</p>
            <p className="text-sm text-slate-500">Transaction fee applies</p>
          </div>
          <div className="rounded-xl border-2 border-action p-6">
            <h3 className="text-lg font-semibold text-navy">Growth</h3>
            <p className="mt-2 text-sm text-slate-600">For multi-location teams and contractors.</p>
            <p className="mt-4 text-2xl font-bold text-navy">$299/mo</p>
            <p className="text-sm text-slate-500">+ reduced transaction fees</p>
          </div>
          <div className="rounded-xl border border-borderBrand p-6">
            <h3 className="text-lg font-semibold text-navy">Enterprise</h3>
            <p className="mt-2 text-sm text-slate-600">Custom deployment, SLA, and integrations.</p>
            <p className="mt-4 text-2xl font-bold text-navy">Custom</p>
            <p className="text-sm text-slate-500">Contact sales</p>
          </div>
        </div>
      </div>

      <div className="mt-14 flex flex-col items-start gap-4 sm:flex-row">
        <Link
          href="/dispatch"
          className="inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy"
        >
          Request an enterprise consultation
        </Link>
        <Link
          href="/ginc"
          className="inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Explore the public GINC network
        </Link>
      </div>
    </div>
  );
}
