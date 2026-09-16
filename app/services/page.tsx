import type { Metadata } from 'next';
import Link from 'next/link';
import { closeoutItems, serviceGroups } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Managed IT Services & Technical Field Operations | Already Here LLC',
  description:
    'Already Here LLC is a Phoenix-based managed service provider (MSP) delivering managed IT support, network and systems administration, security, cloud and infrastructure support, help desk services, onsite technical field services, rollouts, break/fix, remediation, retail technology, data center support, and multi-site project execution.',
  alternates: { canonical: '/services' }
};

const managedServices = [
  'Managed IT support and technical administration',
  'Help desk, remote support, and user support',
  'Network, Wi-Fi, firewall, and infrastructure management',
  'Windows, server, endpoint, and systems administration',
  'Cloud, identity, access, and Microsoft 365 support',
  'Security hardening, troubleshooting, and remediation',
  'Monitoring, maintenance, lifecycle, and documentation',
  'Vendor coordination, projects, rollouts, and escalation support'
] as const;

export default function ServicesPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Services</span>
      <h1 className="section-title mt-5">Managed IT services backed by real-world field execution.</h1>
      <p className="section-copy">
        Already Here LLC is a managed service provider (MSP) with deep hands-on infrastructure and field-service capability. We support businesses with remote and onsite IT operations, network and systems administration, security, cloud and endpoint support, help desk services, troubleshooting, lifecycle work, and project execution. Our field operations extend that MSP capability into physical sites for deployments, break/fix, remediation, rollouts, smart hands, and structured closeout.
      </p>

      <section className="mt-12 card p-8 sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="grid-label">Core MSP Services</span>
            <h2 className="mt-4 text-2xl font-semibold text-navy">Managed IT Services</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Ongoing and project-based IT support for organizations that need an experienced technical partner across users, endpoints, networks, servers, cloud services, security, vendors, and onsite infrastructure.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {managedServices.map((item) => (
              <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-4 text-sm leading-6 text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-12 grid gap-6">
        {serviceGroups.map((group) => (
          <section key={group.title} className="card p-8 sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h2 className="text-2xl font-semibold text-navy">{group.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{group.description}</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-4 text-sm leading-6 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12 card p-8 sm:p-10">
        <span className="grid-label">Operational standard</span>
        <h2 className="mt-4 text-2xl font-semibold text-navy">Managed support and field work both close with usable documentation.</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          The value is not only resolving the issue. It is maintaining clear technical records, communicating status, documenting changes, capturing photos or notes when permitted, recording inventory detail when applicable, coordinating vendors and returns when applicable, and leaving the client with a usable support or project closeout record.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {closeoutItems.map((item) => (
            <div key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-4 text-sm leading-6 text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 card bg-navy p-8 text-white sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-2xl font-semibold">Need managed IT support or onsite technical coverage?</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
              Send the issue, environment, location, service window, number of users or sites, and any supporting files. We can route the request as managed support, project work, or field dispatch based on the actual scope.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy">
              Request IT Support
            </Link>
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white">
              Request Field Dispatch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
