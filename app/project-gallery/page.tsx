import type { Metadata } from 'next';
import Link from 'next/link';
import { ProjectGalleryGrid } from '@/components/ProjectGalleryGrid';
import { siteConfig } from '@/lib/site';

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
            Approved project photos can rotate automatically from the OCI-hosted gallery agent. If no approved images are available, the page falls back to representative redacted work examples.
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
        <ProjectGalleryGrid />
      </section>
    </>
  );
}
