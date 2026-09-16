import type { Metadata } from 'next';
import Link from 'next/link';
import { environments } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Who We Serve | Managed IT for Phoenix Businesses & IT Teams',
  description:
    'Already Here LLC provides managed IT, co-managed support, network and systems administration, cloud, security, projects, and onsite technical services for Phoenix businesses, internal IT teams, multi-site operators, and service partners.',
  alternates: { canonical: '/who-we-serve' }
};

const audiences = [
  {
    title: 'Small and midsize businesses',
    body: 'Organizations that need an experienced IT partner to support users, endpoints, networks, systems, Microsoft 365, cloud services, security controls, vendors, projects, and recurring technical operations.'
  },
  {
    title: 'Organizations without a full internal IT department',
    body: 'Businesses that need practical technical ownership without building every support, administration, security, infrastructure, and project function internally.'
  },
  {
    title: 'Internal IT teams and co-managed environments',
    body: 'IT departments that need escalation capacity, project support, infrastructure depth, documentation, vendor coordination, local hands, or additional operational coverage without replacing the internal team.'
  },
  {
    title: 'Retail, commercial, and multi-site operators',
    body: 'Organizations managing technology across multiple locations that need coordinated support for networks, endpoints, POS and store systems, rollouts, remediation, surveys, lifecycle work, and onsite execution.'
  },
  {
    title: 'Healthcare-adjacent and controlled environments',
    body: 'Organizations where access, documentation, equipment handling, change discipline, and reliable technical closeout matter as much as the repair or deployment itself.'
  },
  {
    title: 'Government primes, OEMs, vendors, and service partners',
    body: 'Teams that need a technically experienced Phoenix-based partner for managed support, infrastructure projects, smart hands, field execution, deployments, remediation, and documented closeout.'
  }
] as const;

const fitSignals = [
  'You want recurring managed IT support rather than one-off repair only',
  'Your internal team needs co-managed engineering or escalation capacity',
  'Security, identity, cloud, network, endpoint, and infrastructure work need to be coordinated',
  'You need one partner that can support users remotely and execute onsite when required',
  'Projects and changes require usable technical documentation and clear ownership',
  'You operate multiple sites or depend on vendors that need stronger coordination'
] as const;

export default function WhoWeServePage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Who We Serve</span>
      <h1 className="section-title mt-5">Managed IT for organizations that need experienced, accountable technical ownership.</h1>
      <p className="section-copy">
        Already Here LLC supports organizations that need more than a repair technician and more flexibility than a remote-only provider. With 30+ years of IT experience and an operating history dating to 2013, we can support recurring managed IT, augment internal teams, deliver technical projects, and extend the same support model into physical sites when onsite execution is required.
      </p>

      <section className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Organizations we support">
        {audiences.map((audience) => (
          <article key={audience.title} className="card p-7">
            <h2 className="text-xl font-semibold text-navy">{audience.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{audience.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 card bg-navy p-8 text-white sm:p-10">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Good fit indicators</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">The strongest fit is an organization that wants problems owned, not merely handed off.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fitSignals.map((item) => (
            <div key={item} className="rounded-2xl border border-white/15 bg-white/5 px-5 py-5 text-sm leading-7 text-white/80">{item}</div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <span className="grid-label">Operating environments</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy">Experience across business, enterprise, infrastructure, retail, and controlled sites.</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          The environment changes the operating details, but the core discipline stays consistent: understand the technical state, communicate clearly, make controlled changes, document the outcome, and escalate anything that remains unresolved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {environments.map((environment) => (
            <span key={environment} className="rounded-full border border-borderBrand bg-white px-4 py-2 text-sm text-slate-700">{environment}</span>
          ))}
        </div>
      </section>

      <section className="mt-16 card p-8 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="grid-label">Start with scope</span>
            <h2 className="mt-4 text-2xl font-semibold text-navy">Not sure whether you need managed IT, co-managed support, a project, or onsite service?</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Send the organization size, users or sites, current environment, problems or objectives, timing, and existing IT responsibilities. The request can then be routed to the operating model that fits the actual need.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white">Request IT Consultation</Link>
            <Link href="/services" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy">View Services</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
