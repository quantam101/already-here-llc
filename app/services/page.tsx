import type { Metadata } from 'next';
import Link from 'next/link';
import { closeoutItems, serviceGroups } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Managed IT Services, Security, Cloud & Field Support',
  description:
    'Already Here LLC is a Phoenix-based managed service provider (MSP) with 30+ years of IT experience, delivering managed IT support, help desk services, network and systems administration, Microsoft 365 and cloud support, security hardening, infrastructure services, and onsite technical field operations.',
  alternates: { canonical: '/services' },
  openGraph: {
    title: 'Managed IT Services, Security, Cloud & Field Support | Already Here LLC',
    description:
      'Phoenix managed IT services backed by 30+ years of hands-on IT experience, including help desk, networks, systems, cloud, security, projects, and onsite field support.',
    url: '/services',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const managedServiceGroups = [
  {
    id: 'managed-it',
    title: 'Managed IT & Help Desk',
    description: 'Day-to-day technical ownership for users, endpoints, systems, vendors, and recurring support requirements.',
    items: [
      'Help desk, remote support, and user troubleshooting',
      'Endpoint, Windows, server, and systems administration',
      'Monitoring, maintenance, patching, and lifecycle support',
      'User onboarding, offboarding, documentation, and escalation'
    ]
  },
  {
    id: 'security',
    title: 'Cybersecurity & Risk Reduction',
    description: 'Practical security controls integrated into the operating environment instead of treated as a separate afterthought.',
    items: [
      'Endpoint and operating-system security hardening',
      'Identity, access, MFA, and account-security support',
      'Firewall, network-security, and secure configuration support',
      'Security troubleshooting, remediation, and technical documentation'
    ]
  },
  {
    id: 'cloud',
    title: 'Microsoft 365, Cloud & Identity',
    description: 'Administration and support for cloud productivity, identity, access, collaboration, and related business technology.',
    items: [
      'Microsoft 365 administration and user support',
      'Cloud, identity, access, and account administration',
      'Email, collaboration, permissions, and service troubleshooting',
      'Migration, change, rollout, and vendor coordination support'
    ]
  },
  {
    id: 'infrastructure',
    title: 'Network, Wi-Fi & Infrastructure',
    description: 'Management and troubleshooting across the network stack, business systems, physical infrastructure, and connected sites.',
    items: [
      'LAN, switching, routing, VLAN, Wi-Fi, and firewall support',
      'Server, storage, endpoint, and infrastructure administration',
      'Network troubleshooting, remediation, and performance investigation',
      'Infrastructure lifecycle, documentation, vendor, and project support'
    ]
  },
  {
    id: 'strategy',
    title: 'IT Strategy, Projects & Vendor Management',
    description: 'Technical planning and coordination for organizations that need experienced IT ownership beyond reactive ticket work.',
    items: [
      'Technology planning, standards, documentation, and roadmap support',
      'Vendor, licensing, service-provider, and escalation coordination',
      'Infrastructure, refresh, migration, deployment, and remediation projects',
      'Technical assessment, scope validation, and implementation planning'
    ]
  },
  {
    id: 'field-operations',
    title: 'Onsite IT & Technical Field Operations',
    description: 'The physical execution layer that lets the MSP own issues that cannot be solved remotely.',
    items: [
      'Onsite smart hands, troubleshooting, break/fix, and remediation',
      'Network, server, endpoint, POS, retail, and infrastructure site work',
      'Deployments, rollouts, surveys, refreshes, and multi-site execution',
      'Structured closeout, photos when permitted, asset detail, and escalation notes'
    ]
  }
] as const;

const engagementModels = [
  {
    title: 'Fully Managed IT',
    body: 'For organizations that want one accountable technical partner to coordinate recurring support, administration, maintenance, vendors, projects, and onsite needs.'
  },
  {
    title: 'Co-Managed IT',
    body: 'For internal IT teams that need additional engineering depth, escalation capacity, project support, local hands, documentation, or coverage without replacing the internal team.'
  },
  {
    title: 'Projects & Onsite Support',
    body: 'For defined migrations, remediation, deployments, infrastructure work, multi-site programs, break/fix, smart hands, and field execution.'
  }
] as const;

export default function ServicesPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Managed IT Services</span>
      <h1 className="section-title mt-5">Managed IT services backed by real-world engineering and onsite execution.</h1>
      <p className="section-copy">
        Already Here LLC is a Phoenix-based managed service provider (MSP) with 30+ years of IT experience and an operating history dating to 2013. We support businesses with help desk and remote support, network and systems administration, Microsoft 365 and cloud services, identity and access, security hardening, infrastructure management, vendor coordination, projects, and onsite technical operations. Field services are an extension of the MSP capability, not a substitute for it.
      </p>

      <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
        {['30+ Years IT Experience', 'Operating Since 2013', 'Phoenix-Based MSP', 'Remote + Onsite Support', 'Commercially Insured', 'Veteran-Owned'].map((item) => (
          <span key={item} className="rounded-full border border-borderBrand bg-white px-3 py-2">{item}</span>
        ))}
      </div>

      <section className="mt-12" aria-labelledby="managed-services-heading">
        <span className="grid-label">Core MSP capabilities</span>
        <h2 id="managed-services-heading" className="mt-4 text-3xl font-semibold tracking-tight text-navy">Complete managed IT coverage across the operating environment.</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          Support is organized around the systems a business actually depends on: people, endpoints, identity, cloud services, networks, servers, security controls, vendors, projects, and physical sites.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {managedServiceGroups.map((group) => (
            <article id={group.id} key={group.id} className="card scroll-mt-28 p-8 sm:p-10">
              <h3 className="text-2xl font-semibold text-navy">{group.title}</h3>
              <p className="mt-4 text-base leading-7 text-slate-600">{group.description}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-4 text-sm leading-6 text-slate-700">{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 card bg-navy p-8 text-white sm:p-10">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Engagement models</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">One MSP, multiple ways to engage.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {engagementModels.map((model) => (
            <div key={model.title} className="rounded-3xl border border-white/15 bg-white/5 p-6">
              <h3 className="text-lg font-semibold">{model.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/75">{model.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="specialized-field-services" className="mt-16 scroll-mt-28">
        <span className="grid-label">Specialized onsite capabilities</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy">Field operations extend the managed-service relationship into the physical site.</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          When remote administration reaches a physical constraint, Already Here LLC can continue the work onsite. These capabilities also support standalone project and service-partner engagements.
        </p>
        <div className="mt-8 grid gap-6">
          {serviceGroups.map((group) => (
            <article key={group.title} className="card p-8 sm:p-10">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <h3 className="text-2xl font-semibold text-navy">{group.title}</h3>
                  <p className="mt-4 text-base leading-7 text-slate-600">{group.description}</p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-4 text-sm leading-6 text-slate-700">{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 card p-8 sm:p-10">
        <span className="grid-label">Operational standard</span>
        <h2 className="mt-4 text-2xl font-semibold text-navy">Managed support and field work both close with usable documentation.</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          The objective is not merely to make an issue disappear. It is to maintain clear technical records, communicate status, document changes, capture permitted evidence, record relevant inventory detail, coordinate vendors and returns when applicable, and leave the client with a usable support or project closeout record.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {closeoutItems.map((item) => (
            <div key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-4 text-sm leading-6 text-slate-700">{item}</div>
          ))}
        </div>
      </section>

      <section className="mt-16 card bg-navy p-8 text-white sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-2xl font-semibold">Need an MSP, co-managed support, a project, or onsite technical coverage?</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
              Send the environment, number of users or sites, current needs, priorities, service window, and any supporting files. We will route the request to the right engagement path instead of forcing every need into a field-dispatch model.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy">Request IT Support</Link>
            <Link href="/capability-statement" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white">View Capability Statement</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
