import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/lib/site';
import { buildConversionHref, getVideoLane } from '@/lib/youtube-video-campaign';

// Landing pages for YouTube video ads. They are reached from the ad, not from
// search, so they stay out of the index and out of the sitemap.
type LaneParams = Promise<{ lane: string }>;
type LaneSearch = Promise<Record<string, string | string[] | undefined>>;

const laneCopy: Record<string, { eyebrow: string; title: string; points: string[]; cta: string; note: string }> = {
  'msp-smart-hands': {
    eyebrow: 'For MSPs and national service partners',
    title: 'A Phoenix tech onsite for the tickets remote hands cannot close.',
    points: [
      'Smart hands, break/fix, rack and stack, drive and component swaps',
      'Network, AP and SD-WAN work with your engineer on the bridge',
      'Photos, serials and notes in the closeout before the tech leaves',
      'Phoenix-based, with project coverage outside Arizona by scope'
    ],
    cta: 'Send a ticket or scope',
    note: 'Tell us the site, the window and what done looks like. We confirm coverage and rate before anyone rolls.'
  },
  'phoenix-business-it': {
    eyebrow: 'For Phoenix Valley businesses',
    title: 'Wi-Fi, network, POS or cameras down? We come to your site.',
    points: [
      'Business Wi-Fi and access point installs and fixes',
      'Network cabling, testing and labeling',
      'POS, payment device, printer and kiosk work',
      'Written closeout of what was done and what is left'
    ],
    cta: 'Request a site visit',
    note: 'Describe the problem and the address. We reply with next steps and a quote before any work starts.'
  },
  'field-tech-recruiting': {
    eyebrow: 'For independent field techs',
    title: 'Steady 1099 field work for techs who fix it and document it.',
    points: [
      'Smart hands, POS, network, AP and cabling work orders',
      'Matched to the area you say you cover',
      '1099 independent contractor work',
      'Clear scopes, closeout requirements and rates up front'
    ],
    cta: 'Join the technician network',
    note: 'Apply once with your coverage area, skills and tools. We reach out when work fits.'
  }
};

export async function generateMetadata({ params }: { params: LaneParams }): Promise<Metadata> {
  const { lane: laneId } = await params;
  const lane = getVideoLane(laneId);
  const copy = laneCopy[laneId];
  if (!lane || !copy) return { title: 'Not found', robots: { index: false, follow: false } };
  return {
    title: `${copy.title} | ${siteConfig.name}`,
    description: lane.promise,
    robots: { index: false, follow: false }
  };
}

export default async function VideoLandingPage({ params, searchParams }: { params: LaneParams; searchParams: LaneSearch }) {
  const { lane: laneId } = await params;
  const lane = getVideoLane(laneId);
  const copy = laneCopy[laneId];
  if (!lane || !copy) notFound();

  const ctaHref = buildConversionHref(lane, await searchParams);

  return (
    <div className="bg-slate-950 text-slate-100">
      <section className="container-shell mx-auto grid max-w-6xl gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:py-20">
        <div>
          <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-amber-300">
            {copy.eyebrow}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">{copy.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{lane.promise}</p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {copy.points.map((point, index) => (
              <li key={point} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
                <span className="text-sm font-bold text-amber-400">0{index + 1}</span>
                <p className="mt-2 text-sm leading-6 text-slate-200">{point}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 lg:sticky lg:top-8">
          <p className="text-lg font-bold text-white">{copy.cta}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{copy.note}</p>
          <Link
            href={ctaHref}
            className="mt-6 block rounded-full bg-amber-400 px-5 py-3 text-center text-sm font-bold text-slate-950 hover:bg-amber-300"
          >
            {copy.cta}
          </Link>
          <a className="mt-4 block text-center text-sm font-semibold text-amber-300 underline underline-offset-4" href={siteConfig.phoneHref}>
            Call {siteConfig.phoneDisplay}
          </a>
          <p className="mt-6 text-xs leading-5 text-slate-400">
            {siteConfig.name} · Phoenix, Arizona · Phoenix • Glendale • Peoria • Scottsdale • Tempe • Mesa • Chandler • Gilbert
          </p>
        </div>
      </section>
    </div>
  );
}
