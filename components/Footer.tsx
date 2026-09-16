import Link from 'next/link';
import { markets, siteConfig } from '@/lib/site';
import { NewsletterSignup } from '@/components/NewsletterSignup';

export function Footer() {
  return (
    <footer className="border-t border-borderBrand bg-white">
      <div className="container-shell grid gap-12 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="text-lg font-semibold text-navy">{siteConfig.name}</div>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Phoenix-based managed service provider with 30+ years of IT experience, delivering remote and onsite IT support, network and systems administration, security, Microsoft 365 and cloud support, infrastructure services, projects, and technical field operations.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            <span className="rounded-full border border-borderBrand px-3 py-1">Managed IT Services</span>
            <span className="rounded-full border border-borderBrand px-3 py-1">30+ Years IT Experience</span>
            <span className="rounded-full border border-borderBrand px-3 py-1">Operating Since 2013</span>
            <span className="rounded-full border border-borderBrand px-3 py-1">Phoenix-Based</span>
            <span className="rounded-full border border-borderBrand px-3 py-1">Commercially Insured</span>
            <span className="rounded-full border border-borderBrand px-3 py-1">Veteran-Owned</span>
            <span className="rounded-full border border-borderBrand px-3 py-1">SAM.gov Registered</span>
          </div>
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">IT operations newsletter</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Managed IT, infrastructure, security, cloud, field operations, and practical technology playbooks.</p>
            <div className="mt-3 max-w-md"><NewsletterSignup /></div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Navigation</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li><Link href="/" className="hover:text-action">Home</Link></li>
            <li><Link href="/services" className="hover:text-action">Managed IT Services</Link></li>
            <li><Link href="/who-we-serve" className="hover:text-action">Who We Serve</Link></li>
            <li><Link href="/dispatch" className="hover:text-action">Request IT Support</Link></li>
            <li><Link href="/emergency-dispatch" className="hover:text-action">Same-Day Onsite Support</Link></li>
            <li><Link href="/rfq" className="hover:text-action">Project RFQ</Link></li>
            <li><Link href="/coverage" className="hover:text-action">Coverage Area</Link></li>
            <li><Link href="/project-gallery" className="hover:text-action">Project Gallery</Link></li>
            <li><Link href="/capability-statement" className="hover:text-action">Capability Statement</Link></li>
            <li><Link href="/blog" className="hover:text-action">IT & Field Insights</Link></li>
            <li><Link href="/privacy" className="hover:text-action">Privacy Policy</Link></li>
            <li><Link href="/legal/terms" className="hover:text-action">Terms of Service</Link></li>
            <li><Link href="/legal/gdpr" className="hover:text-action">GDPR & Data Rights</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Service area & project markets</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">Phoenix metro is the core local managed-service market. Onsite Arizona and broader project coverage are available by scope.</p>
          <p className="mt-3 text-xs leading-6 text-slate-500">{markets.join(' - ')}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Direct contact</h2>
          <address className="mt-4 not-italic space-y-2 text-sm text-slate-600">
            <p className="font-medium text-navy">{siteConfig.name}</p>
            <p>{siteConfig.address.street}<br />{siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}</p>
            <p>
              <a href={siteConfig.phoneHref} className="transition-colors hover:text-action">{siteConfig.phoneDisplay}</a>
              <span className="ml-2 text-xs text-slate-400">- Managed IT and service intake</span>
            </p>
            <p><a href={`mailto:${siteConfig.email}`} className="transition-colors hover:text-action">{siteConfig.email}</a></p>
          </address>
          <Link href="/dispatch" className="link-ring mt-6 inline-flex items-center justify-center rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy">Request IT Support</Link>
        </div>
      </div>

      <div className="border-t border-borderBrand py-6">
        <div className="container-shell flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p className="text-xs">Use the support intake for managed IT, projects, remote support, or onsite service requirements.</p>
        </div>
      </div>
    </footer>
  );
}
