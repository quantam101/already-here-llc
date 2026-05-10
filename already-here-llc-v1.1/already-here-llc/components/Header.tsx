'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { siteConfig } from '@/lib/site';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/who-we-serve', label: 'Who We Serve' },
  { href: '/capability-statement', label: 'Capability Statement' },
  { href: '/blog', label: 'Field Insights' },
  { href: '/dispatch', label: 'Dispatch' }
];

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link href={href} className={`link-ring rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-action text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-navy'}`}>{label}</Link>
  );
}

function InlineBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <svg className="h-11 w-11 shrink-0" viewBox="0 0 96 96" role="img" aria-label="Already Here LLC mark" xmlns="http://www.w3.org/2000/svg">
        <rect width="96" height="96" rx="24" fill="#071B34" />
        <ellipse cx="48" cy="47" rx="35" ry="13" transform="rotate(-28 48 47)" fill="none" stroke="#1B66FF" strokeWidth="6" />
        <path d="M48 16C35.2 16 24.8 26.4 24.8 39.2C24.8 57.6 48 82 48 82C48 82 71.2 57.6 71.2 39.2C71.2 26.4 60.8 16 48 16Z" fill="#FFFFFF" />
        <path d="M48 23.5C39.3 23.5 32.2 30.5 32.2 39.2C32.2 50.4 43.9 65.2 48 70.1C52.1 65.2 63.8 50.4 63.8 39.2C63.8 30.5 56.7 23.5 48 23.5Z" fill="#071B34" />
        <circle cx="48" cy="39" r="8.5" fill="#1B66FF" />
        <circle cx="75" cy="33" r="4.5" fill="#1B66FF" />
        <circle cx="21" cy="61" r="4.5" fill="#7E8A9A" />
      </svg>
      <div className="min-w-0 leading-none">
        <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-navy">ALREADY HERE LLC</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">ONSITE INFRASTRUCTURE EXECUTION</div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-borderBrand/80 bg-white/95 backdrop-blur">
      <div className="container-shell flex items-center justify-between py-4">
        <Link href="/" className="link-ring flex items-center rounded-2xl" aria-label="Already Here LLC home"><InlineBrandMark /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">{navItems.map((item) => <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />)}</nav>
        <div className="hidden items-center gap-3 lg:flex">
          <a href={siteConfig.phoneHref} className="link-ring rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-navy transition hover:border-action hover:text-action" aria-label="Call Already Here LLC">{siteConfig.phoneDisplay}</a>
          <Link href="/dispatch" className="link-ring rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy">Request Dispatch</Link>
        </div>
        <button type="button" className="link-ring inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-borderBrand text-navy lg:hidden" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation"><span className="text-sm font-semibold">{open ? 'Close' : 'Menu'}</span></button>
      </div>
      {open ? (
        <div id="mobile-nav" className="border-t border-borderBrand bg-white lg:hidden">
          <div className="container-shell flex flex-col gap-3 py-4">
            {navItems.map((item) => <Link key={item.href} href={item.href} className={`link-ring rounded-2xl px-4 py-3 text-sm font-medium ${pathname === item.href ? 'bg-action text-white' : 'bg-slate-50 text-navy'}`} onClick={() => setOpen(false)}>{item.label}</Link>)}
            <div className="grid grid-cols-2 gap-3 pt-2"><a href={siteConfig.phoneHref} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-center text-sm font-medium text-navy" onClick={() => setOpen(false)}>{siteConfig.phoneDisplay}</a><Link href="/dispatch" className="link-ring rounded-2xl bg-action px-4 py-3 text-center text-sm font-semibold text-white" onClick={() => setOpen(false)}>Request Dispatch</Link></div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
