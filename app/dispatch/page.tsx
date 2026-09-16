import type { Metadata } from 'next';
import Link from 'next/link';
import { DispatchForm } from '@/components/DispatchForm';
import { pricingTiers, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Request IT Support or Field Dispatch',
  description:
    'Request managed IT support, an MSP consultation, project work, remote technical support, or onsite field service from Already Here LLC in Phoenix.',
  alternates: { canonical: '/dispatch' }
};

const servicePaths = [
  {
    title: 'Managed IT / Recurring Support',
    body: 'For organizations evaluating ongoing IT support, administration, maintenance, vendor coordination, security, cloud, network, or systems ownership.'
  },
  {
    title: 'Remote Support / Administration',
    body: 'For user, endpoint, server, network, Microsoft 365, cloud, identity, access, configuration, troubleshooting, or escalation needs.'
  },
  {
    title: 'Projects / Migration / Remediation',
    body: 'For defined infrastructure, refresh, rollout, migration, remediation, vendor, documentation, or technology-change work.'
  },
  {
    title: 'Onsite / Same-Day Field Service',
    body: 'For smart hands, break/fix, site visits, physical troubleshooting, installations, equipment replacement, surveys, rollouts, and field closeout.'
  }
] as const;

export default function DispatchPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <span className="eyebrow">IT support & service intake</span>
          <h1 className="section-title mt-5">Tell us what your IT environment needs.</h1>
          <p className="section-copy">
            Use this intake for managed IT discussions, recurring support, remote administration, projects, or onsite field service. Include the organization, number of users or sites, current environment, issue or objective, timing, and any files that matter. The request will be routed to the appropriate service path instead of assuming every need is a dispatch ticket.
          </p>

          <section className="mt-8 card p-6" aria-labelledby="service-path-heading">
            <h2 id="service-path-heading" className="grid-label mb-4">Service paths</h2>
            <div className="grid gap-3">
              {servicePaths.map((path) => (
                <div key={path.title} className="rounded-2xl border border-borderBrand bg-soft p-4">
                  <h3 className="text-sm font-semibold text-navy">{path.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-slate-600">{path.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 card p-6" aria-labelledby="pricing-heading">
            <h2 id="pricing-heading" className="grid-label mb-4">Onsite & project pricing</h2>
            <p className="mb-5 text-sm leading-7 text-slate-600">
              Recurring managed services are scoped separately based on the environment, users, devices, responsibilities, service requirements, and support model. The rates below apply to field and project work, where pricing varies by scope, travel, access, priority, and closeout requirements.
            </p>
            <div className="grid gap-3">
              {pricingTiers.map((tier) => (
                <div key={tier.label} className="rounded-2xl border border-borderBrand bg-soft p-4">
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-navy">{tier.label}</span>
                    <span className="text-xs font-semibold text-action">{tier.value}</span>
                  </div>
                  <p className="text-xs text-slate-500">{tier.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-borderBrand bg-soft p-6" aria-labelledby="urgent-heading">
            <h2 id="urgent-heading" className="grid-label mb-3">Urgent onsite requests</h2>
            <p className="mb-4 text-sm leading-7 text-slate-600">
              For urgent or same-day onsite requirements, use the rapid-dispatch path or call directly so timing and coverage can be assessed immediately.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/emergency-dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-semibold text-white">Same-Day Onsite Support</Link>
              <a href={siteConfig.phoneHref} className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand bg-white px-5 py-3 text-sm font-semibold text-navy">{siteConfig.phoneDisplay}</a>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-borderBrand bg-soft p-6" aria-labelledby="after-submit-heading">
            <h2 id="after-submit-heading" className="grid-label mb-3">After you submit</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                'The request is classified as managed services, remote support, project work, or onsite field service.',
                'Scope, environment, responsibilities, timing, access needs, and service fit are reviewed.',
                'You receive confirmation, next-step questions, scheduling information, or a consultation path.',
                'Approved work proceeds with clear communication and usable technical documentation.'
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div>
          <DispatchForm />
        </div>
      </div>
    </div>
  );
}
