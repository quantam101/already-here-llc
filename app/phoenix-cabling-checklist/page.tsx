import type { Metadata } from 'next';
import Link from 'next/link';
import { PhoenixCablingLeadForm } from '@/components/PhoenixCablingLeadForm';
import { defaultOgImage } from '@/lib/og';

export const metadata: Metadata = {
  title: 'Phoenix Commercial IT Cabling Checklist | Free PDF Guide',
  description: 'Free Phoenix commercial network cabling checklist for office build-outs and warehouses. Avoid planning, testing, pathway, and code-review mistakes.',
  alternates: { canonical: 'https://www.alreadyherellc.com/phoenix-cabling-checklist' },
  openGraph: {
    images: [defaultOgImage],
    title: 'Free Phoenix Commercial IT Cabling Checklist | Already Here LLC',
    description: 'Five cabling planning mistakes to avoid in Phoenix business build-outs and network upgrades.',
    url: 'https://www.alreadyherellc.com/phoenix-cabling-checklist',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const issues = [
  { title: 'Cabling ratings and heat exposure', body: 'Confirm the environment, air-handling spaces, proper listed materials, and local authority requirements before installation.' },
  { title: 'Cat6 versus Cat6A planning', body: 'Choose the appropriate cable category based on intended bandwidth, link length, PoE loading, and lifecycle—not generic claims.' },
  { title: 'Pathways and interference', body: 'Coordinate conduit, trays, labeling, rack locations, cable separation, and firestopping early.' },
  { title: 'Testing and closeout evidence', body: 'Specify field certification limits, cable IDs, as-builts, exceptions, and acceptable test-report exports.' },
  { title: 'Licenses, permits, and responsibility', body: 'Confirm the precise contractor scope, applicable Arizona ROC license requirements, municipal permits, and inspection ownership.' }
] as const;

export default function PhoenixCablingChecklistPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <section className="container-shell mx-auto grid max-w-6xl gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:py-20">
        <div>
          <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-amber-300">
            Free Phoenix Valley business resource
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Avoid costly cabling mistakes on your next Phoenix office build-out.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Get a practical two-page guide covering five critical areas: material ratings, capacity, pathways,
            acceptance testing, and Arizona contractor and permit checks.
          </p>
          <p className="mt-5 text-sm font-semibold text-amber-300">
            For business owners, general contractors, property managers, and IT project leads.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {issues.map((issue, index) => (
              <article key={issue.title} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
                <span className="text-sm font-bold text-amber-400">0{index + 1}</span>
                <h2 className="mt-2 text-base font-bold text-white">{issue.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{issue.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-7 max-w-2xl text-sm leading-6 text-slate-400">
            This guide is educational. Requirements depend on the specific occupancy, installation,
            municipality, and scope. Review code and licensing with the appropriate local authorities.
          </p>
        </div>
        <div className="lg:sticky lg:top-8">
          <PhoenixCablingLeadForm />
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm leading-6 text-slate-300">
            <p className="font-bold text-white">Already Here LLC</p>
            <p>Phoenix-based managed IT, network infrastructure, and onsite field operations.</p>
            <p className="mt-2">Phoenix • Tempe • Mesa • Chandler • Scottsdale • Gilbert • Glendale • Peoria and surrounding Valley cities</p>
            <p className="mt-3">
              Already have a scoped project? <Link href="/rfq" className="font-semibold text-amber-300 underline">Request an IT project assessment</Link>.
            </p>
            <a className="mt-2 block text-amber-300 underline" href="tel:+16028822920">Call (602) 882-2920</a>
          </div>
        </div>
      </section>
    </div>
  );
}
