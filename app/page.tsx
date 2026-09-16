import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFaq } from '@/components/SiteFaq';
import { representativeWork, siteConfig } from '@/lib/site';

const pageDescription =
  'Already Here LLC is a Phoenix-based managed service provider (MSP) with 30+ years of IT experience, delivering managed IT support, help desk services, network and systems administration, Microsoft 365 and cloud support, security hardening, infrastructure services, and onsite technical support.';

export const metadata: Metadata = {
  title: 'Phoenix Managed IT Services | MSP, Security & Onsite Support',
  description: pageDescription,
  applicationName: siteConfig.name,
  keywords: [
    'Phoenix managed IT services',
    'Phoenix MSP',
    'managed service provider Phoenix',
    'business IT support Phoenix',
    'IT help desk Phoenix',
    'remote IT support',
    'network administration',
    'systems administration',
    'Microsoft 365 support',
    'cloud IT support',
    'IT security services',
    'endpoint management',
    'firewall support',
    'Wi-Fi support',
    'onsite IT support Phoenix',
    'technical field operations',
    'multi-site IT support'
  ],
  alternates: { canonical: 'https://www.alreadyherellc.com' },
  openGraph: {
    title: 'Phoenix Managed IT Services | Already Here LLC',
    description: pageDescription,
    url: 'https://www.alreadyherellc.com',
    siteName: siteConfig.name,
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Phoenix Managed IT Services | Already Here LLC',
    description: pageDescription
  }
};

const coreServices = [
  {
    title: 'Managed IT & Help Desk',
    body: 'Remote user support, endpoint and systems administration, monitoring, maintenance, lifecycle work, documentation, and technical escalation.',
    href: '/services#managed-it'
  },
  {
    title: 'Cybersecurity & Risk Reduction',
    body: 'Security hardening, identity and access support, MFA, firewall and network security, secure configuration, troubleshooting, and remediation.',
    href: '/services#security'
  },
  {
    title: 'Microsoft 365, Cloud & Identity',
    body: 'Administration and support for Microsoft 365, cloud services, accounts, permissions, identity, collaboration, migrations, and change.',
    href: '/services#cloud'
  },
  {
    title: 'Network & Infrastructure',
    body: 'LAN, switching, routing, VLAN, Wi-Fi, firewall, server, storage, endpoint, and infrastructure administration and troubleshooting.',
    href: '/services#infrastructure'
  },
  {
    title: 'IT Strategy, Projects & Vendors',
    body: 'Technology planning, standards, documentation, vendor coordination, infrastructure projects, migrations, refreshes, and remediation.',
    href: '/services#strategy'
  },
  {
    title: 'Onsite IT & Field Operations',
    body: 'Smart hands, break/fix, deployments, rollouts, surveys, retail technology, multi-site work, and structured closeout when physical access is required.',
    href: '/services#field-operations'
  }
] as const;

const engagementModels = [
  {
    title: 'Fully Managed IT',
    body: 'A single technical partner coordinates recurring support, administration, maintenance, vendors, projects, and onsite needs.'
  },
  {
    title: 'Co-Managed IT',
    body: 'Internal IT teams add experienced engineering depth, escalation capacity, project support, local hands, and documentation without replacing their team.'
  },
  {
    title: 'Projects & Onsite Support',
    body: 'Defined migrations, deployments, remediation, infrastructure work, break/fix, smart hands, and multi-site technical execution.'
  }
] as const;

const differentiators = [
  '30+ years of hands-on IT experience across enterprise, healthcare, networking, infrastructure, retail, data center, and field operations',
  'Operating as Already Here LLC since 2013',
  'Remote administration and onsite execution available through the same technical organization',
  'Managed IT, security, cloud, network, systems, project, and field capabilities under one service model',
  'Documented enterprise and service-channel execution history with relationship status stated accurately',
  'Structured technical documentation, escalation notes, asset detail, and closeout discipline'
] as const;

const clientTypes = [
  'Small and midsize businesses that need experienced IT ownership',
  'Organizations without a full internal IT department',
  'Internal IT teams that need co-managed support or escalation capacity',
  'Retail, commercial, and multi-site operators',
  'Healthcare-adjacent, professional, infrastructure, and controlled environments',
  'Government primes, OEMs, vendors, and service partners that need technical execution'
] as const;

export default function HomePage() {
  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-12 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="eyebrow">Phoenix Managed Service Provider (MSP)</span>
              <span className="inline-flex items-center rounded-full border border-borderBrand bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-steel">30+ Years IT Experience</span>
              <span className="inline-flex items-center rounded-full border border-borderBrand bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-steel">Operating Since 2013</span>
            </div>

            <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-6xl">
              Managed IT Services in Phoenix, Backed by 30+ Years of Hands-On IT Experience
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Already Here LLC manages and supports the technology businesses depend on: users, endpoints, networks, servers, Microsoft 365, cloud services, identity, security controls, vendors, projects, and physical sites. When remote support reaches a physical limit, our onsite field capability keeps the same problem moving toward resolution.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">Request IT Support</Link>
              <Link href="/services" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">View Managed IT Services</Link>
              <Link href="/emergency-dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">Same-Day Onsite Help</Link>
            </div>

            <div className="mt-10 rounded-3xl border border-borderBrand bg-soft px-5 py-5">
              <p className="grid-label">Business profile</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Phoenix-Based MSP', 'A+ BBB Rating', 'Commercially Insured', 'Veteran-Owned', 'SAM.gov Registered', 'Remote + Onsite Support'].map((badge) => (
                  <span key={badge} className="rounded-full border border-borderBrand bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{badge}</span>
                ))}
              </div>
            </div>
          </div>

          <aside className="card overflow-hidden">
            <div className="bg-navy p-8 text-white sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Managed IT + Security + Cloud + Field Ops</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">One accountable IT partner from the help desk to the physical site.</h2>
              <p className="mt-4 text-base leading-7 text-white/80">
                The MSP relationship does not stop when a ticket requires a rack, cable, access point, endpoint, server, retail device, or site visit. Already Here LLC can coordinate the remote and onsite layers as one technical operation.
              </p>
            </div>
            <div className="grid gap-3 p-8 sm:p-10">
              {[
                'Help desk and remote IT support',
                'Network and systems administration',
                'Microsoft 365, cloud, identity, and access',
                'Security hardening, firewall, and endpoint support',
                'Projects, vendors, lifecycle, and onsite execution'
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-4 text-sm font-medium text-slate-700">{item}</div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24" aria-labelledby="services-heading">
        <span className="eyebrow">Managed IT capabilities</span>
        <h2 id="services-heading" className="section-title mt-5">Complete IT support built around the business environment.</h2>
        <p className="section-copy">
          Strong managed services are not a list of disconnected tools. They are coordinated ownership across support, administration, security, cloud, infrastructure, vendors, projects, and the physical sites where technology is installed.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {coreServices.map((service) => (
            <Link key={service.title} href={service.href} className="card p-6 transition hover:border-action">
              <h3 className="text-xl font-semibold text-navy">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{service.body}</p>
              <span className="mt-6 inline-flex text-sm font-semibold text-action">Explore service</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="eyebrow">Why Already Here</span>
              <h2 className="section-title mt-5">Experienced technical ownership without the remote-only limitation.</h2>
              <p className="section-copy">
                The company combines long-term IT experience with an operating model that can move from remote administration to physical execution when the technology problem requires it.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {differentiators.map((item) => (
                <div key={item} className="rounded-3xl border border-borderBrand bg-soft px-6 py-6 text-sm leading-7 text-slate-700">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow">Engagement models</span>
        <h2 className="section-title mt-5">Use the level of IT ownership your organization actually needs.</h2>
        <p className="section-copy">Already Here LLC can support recurring managed-service relationships, augment internal IT, or execute defined technical projects and onsite work.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {engagementModels.map((model) => (
            <article key={model.title} className="card p-7">
              <h3 className="text-xl font-semibold text-navy">{model.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{model.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-soft">
        <div className="container-shell py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <span className="eyebrow">MSP differentiator</span>
              <h2 className="section-title mt-5">Field operations are an extension of the MSP, not the company identity.</h2>
              <p className="section-copy">
                Many IT issues can be resolved remotely. Some cannot. Equipment fails, sites need surveys, networks need physical verification, hardware needs replacement, and projects need someone onsite. Already Here LLC keeps that physical work connected to the broader IT support model instead of treating it as an unrelated dispatch business.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/services#field-operations" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white">View Onsite Capabilities</Link>
                <Link href="/capability-statement" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand bg-white px-6 py-3 text-sm font-semibold text-navy">View Capability Statement</Link>
              </div>
            </div>
            <div className="card p-8 sm:p-10">
              <h3 className="text-2xl font-semibold text-navy">Who we support</h3>
              <div className="mt-6 grid gap-3">
                {clientTypes.map((item) => (
                  <div key={item} className="rounded-2xl border border-borderBrand bg-white px-4 py-4 text-sm leading-6 text-slate-700">{item}</div>
                ))}
              </div>
              <Link href="/who-we-serve" className="mt-6 inline-flex text-sm font-semibold text-action">See who we serve</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow">Experience and proof</span>
        <h2 className="section-title mt-5">30+ years of technical experience. Operating since 2013.</h2>
        <p className="section-copy">
          Representative work demonstrates execution across enterprise infrastructure, server and storage, POS and retail technology, networking, healthcare-adjacent environments, IoT, surveys, rollouts, and multi-site support. Direct, subcontracted, service-channel, and marketplace-routed relationships are kept distinct.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {representativeWork.slice(0, 6).map(({ tag, client, scope }) => (
            <article key={scope} className="rounded-3xl border border-borderBrand bg-white p-6">
              <span className="grid-label mb-2 block">{tag}</span>
              <h3 className="text-sm font-semibold leading-snug text-navy">{client}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{scope}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-xs leading-5 text-slate-500">
          Representative project references describe verified execution history and do not imply current preferred-vendor, authorized-service-provider, channel-partner, or certification status unless explicitly stated.
        </p>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell grid gap-8 py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:py-20">
          <div>
            <span className="eyebrow">Phoenix-based support</span>
            <h2 className="section-title mt-5">Local managed IT with broader remote and project capability by scope.</h2>
            <p className="section-copy">
              Phoenix and the surrounding metro are the core local service area. Remote managed support and broader project coverage are available when the client environment, responsibilities, scheduling, and commercial scope are a fit.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/coverage" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy">View Coverage</Link>
            <a href={siteConfig.phoneHref} className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy">{siteConfig.phoneDisplay}</a>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="card bg-navy p-8 text-white sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Start with the actual IT need</span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Need an MSP that can own the issue remotely and show up onsite when required?</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">Send the environment, users or sites, current problems, priorities, timing, and any supporting material. We will route the request as managed IT, co-managed support, a project, or onsite service.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy">Request IT Support</Link>
              <Link href="/services" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white">Review Services</Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFaq />
    </>
  );
}
