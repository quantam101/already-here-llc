import type { Metadata } from 'next';
import Link from 'next/link';
import { ConnectMatchForm } from '@/components/ConnectMatchForm';
import { connectMission, connectNeeds, connectRoles } from '@/lib/connect';

export const metadata: Metadata = {
  title: 'GINC Work — Find Jobs, Workers, and Crews',
  description: 'GINC by Already Here LLC — connect drivers, technicians, contractors, and crew members with businesses, vehicle owners, and fleet operators who need them.',
  alternates: { canonical: '/connect' }
};

export default function ConnectPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">GINC Work</span>
      <h1 className="section-title mt-5">Find work. Find workers. Build crews.</h1>
      <p className="section-copy">
        {connectMission}
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link href="#find-work" className="link-ring inline-flex rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy">
          I have skills / want work
        </Link>
        <Link href="#find-workers" className="link-ring inline-flex rounded-full border border-action px-6 py-3 text-sm font-semibold text-action hover:bg-action/5">
          I need people / contractors
        </Link>
        <Link href="/ginc/network" className="link-ring inline-flex rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-600 hover:border-action hover:text-action">
          Browse network
        </Link>
      </div>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="card p-8" id="find-work">
          <h2 className="text-2xl font-semibold text-navy">I have skills or want work</h2>
          <p className="mt-2 text-sm text-slate-600">
            List your skills, availability, and the kind of work or contracts you&apos;re looking for. We match you with vehicle owners, businesses, and fleet operators who need help.
          </p>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-navy">Roles we match</h3>
            <ul className="mt-3 grid gap-2">
              {connectRoles.map((role) => (
                <li key={role.id} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="text-action">✓</span>
                  <span><strong>{role.title}</strong> — {role.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card p-8" id="find-workers">
          <h2 className="text-2xl font-semibold text-navy">I need people or contractors</h2>
          <p className="mt-2 text-sm text-slate-600">
            Post your work or contract need. We screen and match qualified drivers, technicians, contractors, event staff, and operators to your schedule, budget, and requirements.
          </p>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-navy">Needs we fill</h3>
            <ul className="mt-3 grid gap-2">
              {connectNeeds.map((need) => (
                <li key={need.id} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="text-action">✓</span>
                  <span><strong>{need.title}</strong> — {need.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-12 card bg-navy p-8 text-white sm:p-10">
        <h2 className="text-2xl font-semibold">How matching works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ['Submit', 'Tell us who you are, what you offer, or what you need.'],
            ['Screen', 'We verify identity, skills, availability, insurance, and fit.'],
            ['Match', 'Qualified workers are paired with vetted opportunities.'],
            ['Contract', 'Written terms, payment, and responsibility are confirmed before work starts.']
          ].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/75">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <span className="eyebrow">Match intake</span>
          <h2 className="section-title mt-4">Submit your skills or your need.</h2>
        </div>
        <ConnectMatchForm />
      </section>
    </div>
  );
}
