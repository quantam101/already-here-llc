import type { Metadata } from 'next';
import Link from 'next/link';
import { closeoutItems, serviceGroups } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Dispatches, recurring field support, rollout work, remediation, POS/store technology, networking, AV/media, surveys, and infrastructure-related onsite services in Arizona.',
  alternates: { canonical: '/services' }
};

export default function ServicesPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Services</span>
      <h1 className="section-title mt-5">Launch-ready service scope for B2B field execution.</h1>
      <p className="section-copy">
        Already Here LLC is not positioned as a generic MSP. The public offer is field execution: get onsite, complete the defined work, communicate clearly, and close with documentation that is useful to the dispatching team.
      </p>

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
        <span className="grid-label">Closeout standard</span>
        <h2 className="mt-4 text-2xl font-semibold text-navy">Structured ticket closeout is part of the service.</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          The value is not only the onsite work. It is the combination of field execution, communication, photos or notes when permitted, and closeout language that lets the buyer finish the job internally.
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
            <h2 className="text-2xl font-semibold">Need to confirm whether the scope fits?</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
              Send the work type, city, due window, and any supporting files. Coverage and schedule should be confirmed against the actual scope.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy">
              Request Dispatch
            </Link>
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white">
              Send Scope
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
