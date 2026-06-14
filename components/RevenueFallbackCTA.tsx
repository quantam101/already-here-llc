import Link from 'next/link';
import { siteConfig } from '@/lib/site';

type RevenueFallbackCTAProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  pilotHref?: string;
};

export function RevenueFallbackCTA({
  eyebrow = 'Fallback contact path',
  title = 'Need this routed now?',
  body = 'Use the direct contact path if the demo, intake form, or runtime status check does not behave as expected. Revenue capture should not depend on a single route or backend being online.',
  pilotHref = '/ai-agent#free-trial'
}: RevenueFallbackCTAProps) {
  return (
    <section className="container-shell pb-16">
      <div className="rounded-3xl border border-borderBrand bg-[#071B34] p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">{eyebrow}</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">{body}</p>
            <p className="mt-4 text-sm font-semibold text-white">{siteConfig.phoneDisplay} · {siteConfig.email}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <a href={siteConfig.phoneHref} className="link-ring inline-flex items-center justify-center rounded-full border border-white/35 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              {siteConfig.phoneDisplay}
            </a>
            <a href={`mailto:${siteConfig.email}`} className="link-ring inline-flex items-center justify-center rounded-full border border-white/35 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Email Dispatch
            </a>
            <Link href={pilotHref} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-semibold text-white hover:bg-white hover:text-[#071B34]">
              Request Pilot Setup
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
