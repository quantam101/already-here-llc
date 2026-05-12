import type { Metadata } from 'next';
import { DispatchForm } from '@/components/DispatchForm';
import { pricingTiers, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Request Dispatch',
  description:
    'Submit field dispatch requests to Already Here LLC — Phoenix-based IT field execution for MSPs, vendors, healthcare-adjacent operators, and multi-site rollout programs.',
  alternates: { canonical: '/dispatch' }
};

export default function DispatchPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <span className="eyebrow">Dispatch intake</span>
          <h1 className="section-title mt-5">Send scope. Get it handled.</h1>
          <p className="section-copy">
            Use this form to submit field work requests. Include site city, scope, schedule window, and any files that matter.
            After submission, you receive a confirmation receipt with a dispatch ID. Scope, schedule, access, and coverage are reviewed before scheduling is confirmed.
          </p>

          <div className="mt-8 card p-6">
            <h2 className="grid-label mb-4">Commercial pricing</h2>
            <p className="text-sm text-slate-600 leading-7 mb-5">
              Work is priced per dispatch based on scope, travel, access requirements, and closeout deliverables.
              Typical field dispatch ranges from <strong className="text-navy">$95–$195/hr</strong> depending on scope and priority.
              Project-based and flat-rate pricing available for qualified multi-site programs.
            </p>
            <div className="grid gap-3">
              {pricingTiers.map((tier) => (
                <div key={tier.label} className="rounded-2xl border border-borderBrand bg-soft p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-navy">{tier.label}</span>
                    <span className="text-xs font-semibold text-action">{tier.value}</span>
                  </div>
                  <p className="text-xs text-slate-500">{tier.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-borderBrand bg-soft p-6">
            <h2 className="grid-label mb-3">Urgent / same-day requests</h2>
            <p className="text-sm text-slate-600 leading-7 mb-4">
              For urgent or same-day dispatch needs, call directly. Premium rate applies.
            </p>
            <a
              href={siteConfig.phoneHref}
              className="link-ring inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-action"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1.5 2C1.5 2 2.5 5 4.5 7s4.5 3 4.5 3l1.5-1.5c.5-.5 1.05-.4 1.35.1l.8 1.2c.3.45.1 1.05-.35 1.35C10.5 12.5 9 13.5 7 12.5 4 11 1.5 7.5 1.5 5 .5 3 1.5 1.5 2.5 1c.5-.25 1.05-.05 1.35.45l.8 1.2c.3.45.2 1.05-.25 1.35Z" fill="currentColor"/>
              </svg>
              {siteConfig.phoneDisplay}
            </a>
          </div>

          <div className="mt-6 rounded-3xl border border-borderBrand bg-soft p-6">
            <h2 className="grid-label mb-3">After you submit</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                'Scope is reviewed against current availability, access needs, and coverage fit.',
                'You receive confirmation with a dispatch ID, scheduling details, or a clarifying question.',
                'Onsite execution proceeds with clear communication throughout the field window.',
                'Structured closeout documentation is delivered per ticket requirements.'
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <DispatchForm />
        </div>
      </div>
    </div>
  );
}
