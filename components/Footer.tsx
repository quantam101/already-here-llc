import Link from 'next/link';
import { markets, siteConfig } from '@/lib/site';

export function Footer() {
  return (
    <footer className="border-t border-borderBrand bg-white">
      <div className="container-shell grid gap-12 py-14 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="text-lg font-semibold text-navy">{siteConfig.name}</div>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Phoenix-based field execution partner for vendors, MSPs, and multi-site operators needing onsite support,
            documented closeout, and dependable Arizona project coverage based on scope, scheduling, and travel requirements.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            <span className="rounded-full border border-borderBrand px-3 py-1">Phoenix-based</span>
            <span className="rounded-full border border-borderBrand px-3 py-1">Commercially Insured</span>
            <span className="rounded-full border border-borderBrand px-3 py-1">Structured Closeout</span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Navigation</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li><Link href="/" className="hover:text-action">Home</Link></li>
            <li><Link href="/services" className="hover:text-action">Services</Link></li>
            <li><Link href="/who-we-serve" className="hover:text-action">Who We Serve</Link></li>
            <li><Link href="/contact" className="hover:text-action">Dispatch</Link></li>
            <li><Link href="/privacy" className="hover:text-action">Privacy Policy</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Arizona project markets</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">{markets.join(' · ')}</p>
        </div>
      </div>
      <div className="border-t border-borderBrand py-6">
        <div className="container-shell flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p>Use the dispatch form to submit scope, schedule, and site details.</p>
        </div>
      </div>
    </footer>
  );
}
