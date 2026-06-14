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
            <span className="eyebrow">AI Lead Capture</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-navy">
              Turn missed calls, quote requests, and after-hours inquiries into structured lead records.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Already Here LLC is using its own AI Lead Capture account first, tracking proof, and opening controlled pilot reviews for service businesses that need better intake and follow-up.
            </p>
          </div>
          <Link href="/ai-lead-capture#pilot-intake" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
            Start AI Lead Capture Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
