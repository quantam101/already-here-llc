'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function HomeAiAgentAwareness() {
  const pathname = usePathname();
  if (pathname !== '/') return null;

  return (
    <section className="border-y border-borderBrand bg-soft">
      <div className="container-shell py-10">
        <div className="card grid gap-6 bg-white p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="eyebrow">Business technology add-on</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-navy">
              AI-assisted intake can extend the managed IT environment beyond traditional support tickets.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Already Here LLC also develops and operates AI lead-capture and intake workflows for service businesses. This remains a separate optional capability from the core managed IT, security, cloud, network, systems, and field-service offering.
            </p>
          </div>
          <Link href="/ai-lead-capture#pilot-intake" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
            Review AI Lead Capture
          </Link>
        </div>
      </div>
    </section>
  );
}
