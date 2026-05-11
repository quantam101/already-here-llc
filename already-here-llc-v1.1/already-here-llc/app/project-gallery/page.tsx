import type { Metadata } from 'next';
import Link from 'next/link';
import { representativeWork, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Project Gallery | Already Here LLC',
  description: 'Representative onsite infrastructure execution, retail technology, smart hands, healthcare-adjacent, and rollout recovery work examples.',
  alternates: { canonical: '/project-gallery' },
  openGraph: {
    title: 'Project Gallery | Already Here LLC',
    description: 'Representative onsite infrastructure execution, retail technology, smart hands, healthcare-adjacent, and rollout recovery work examples.',
    url: '/project-gallery',
    siteName: siteConfig.name,
    type: 'website'
  }
};

export default function ProjectGalleryPage() {
  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">Project gallery</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            Redacted field-work examples for infrastructure buyers and dispatch teams.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Representative work is shown without exposing client-confidential photos, locations, credentials, or site-sensitive details. Qualified buyers can request additional verification during procurement review.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
              Request Project Quote
            </Link>
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy transition hover:border-action hover:text-action">
              Request Dispatch
            </Link>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {representativeWork.map((item) => (
            <article key={`${item.client}-${item.tag}`} className="card overflow-hidden">
              <div className="border-b border-borderBrand bg-navy p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">{item.tag}</p>
                <h2 className="mt-3 text-xl font-semibold">{item.client}</h2>
              </div>
              <div className="p-6">
                <div className="mb-5 grid aspect-[4/3] place-items-center rounded-3xl border border-dashed border-borderBrand bg-soft p-6 text-center">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-action">Redacted visual slot</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">Before/after photos, rack images, labels, serials, and site-sensitive details are withheld publicly.</p>
                  </div>
                </div>
                <p className="text-sm leading-7 text-slate-700">{item.scope}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
