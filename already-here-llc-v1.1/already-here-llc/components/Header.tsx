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
  return <Link href={href} className={`link-ring rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-action text-white' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>{label}</Link>;
}

function InlineBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <svg className="h-12 w-12 shrink-0" viewBox="0 0 128 128" role="img" aria-label="Already Here LLC location pin orbit logo" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 87C31 95 62 94 92 80C110 72 121 62 118 55C116 50 106 49 94 53" fill="none" stroke="#071B34" strokeWidth="9" strokeLinecap="round" />
        <path d="M19 94C39 101 76 95 108 77C116 72 122 67 126 61" fill="none" stroke="#071B34" strokeWidth="4" strokeLinecap="round" opacity="0.95" />
        <path d="M64 8C39 8 23 26 23 49C23 80 64 120 64 120C64 120 105 80 105 49C105 26 89 8 64 8Z" fill="#071B34" />
        <path d="M64 8C89 8 105 26 105 49C105 80 64 120 64 120V8Z" fill="#0B4D89" />
        <path d="M66 58L42 88C49 101 64 120 64 120C64 120 105 80 105 49C105 39 102 30 97 23L66 58Z" fill="#0A63A8" opacity="0.9" />
        <circle cx="64" cy="48" r="22" fill="#F8FAFC" />
        <circle cx="64" cy="48" r="14" fill="#FFFFFF" />
        <path d="M15 85C34 94 68 89 99 72C114 64 123 55 121 50" fill="none" stroke="#F8FAFC" strokeWidth="5" strokeLinecap="round" />
        <path d="M14 88C31 99 71 95 109 75" fill="none" stroke="#071B34" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="min-w-0 leading-none">
        <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-white">ALREADY HERE LLC</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-300">ONSITE INFRASTRUCTURE EXECUTION</div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-borderBrand/80 bg-[#040A14]/95 backdrop-blur">
      <div className="container-shell flex items-center justify-between py-4">
        <Link href="/" className="link-ring flex items-center rounded-2xl" aria-label="Already Here LLC home"><InlineBrandMark /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">{navItems.map((item) => <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />)}</nav>
        <div className="hidden items-center gap-3 lg:flex">
          <a href={siteConfig.phoneHref} className="link-ring rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-action hover:text-white" aria-label="Call Already Here LLC">{siteConfig.phoneDisplay}</a>
          <Link href="/dispatch" className="link-ring rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white hover:text-navy">Request Dispatch</Link>
        </div>
        <button type="button" className="link-ring inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 text-white lg:hidden" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation"><span className="text-sm font-semibold">{open ? 'Close' : 'Menu'}</span></button>
      </div>
      {open ? (
        <div id="mobile-nav" className="border-t border-borderBrand bg-[#040A14] lg:hidden">
          <div className="container-shell flex flex-col gap-3 py-4">
            {navItems.map((item) => <Link key={item.href} href={item.href} className={`link-ring rounded-2xl px-4 py-3 text-sm font-medium ${pathname === item.href ? 'bg-action text-white' : 'bg-[#0B1728] text-slate-100'}`} onClick={() => setOpen(false)}>{item.label}</Link>)}
            <div className="grid grid-cols-2 gap-3 pt-2"><a href={siteConfig.phoneHref} className="link-ring rounded-2xl border border-white/20 px-4 py-3 text-center text-sm font-medium text-slate-100" onClick={() => setOpen(false)}>{siteConfig.phoneDisplay}</a><Link href="/dispatch" className="link-ring rounded-2xl bg-action px-4 py-3 text-center text-sm font-semibold text-white" onClick={() => setOpen(false)}>Request Dispatch</Link></div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
