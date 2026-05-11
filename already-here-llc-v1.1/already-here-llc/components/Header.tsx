'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { siteConfig } from '@/lib/site';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/who-we-serve', label: 'Who We Serve' },
  { href: '/coverage', label: 'Coverage' },
  { href: '/project-gallery', label: 'Gallery' },
  { href: '/rfq', label: 'RFQ' },
  { href: '/dispatch', label: 'Dispatch' }
];

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={active ? 'link-ring rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#071B34]' : 'link-ring rounded-full px-3 py-2 text-sm font-semibold text-white hover:bg-white/10'}
    >
      {label}
    </Link>
  );
}

function InlineBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <svg className="h-16 w-16 shrink-0" viewBox="0 0 128 128" role="img" aria-label="Already Here LLC location pin orbit logo" xmlns="http://www.w3.org/2000/svg">
        <path d="M64 9C42 9 25 26 25 48c0 29 39 71 39 71s39-42 39-71C103 26 86 9 64 9Z" fill="#071B34" />
        <path d="M64 9c22 0 39 17 39 39 0 29-39 71-39 71V9Z" fill="#0B4D89" />
        <path d="M65 57 43 86c8 15 21 33 21 33s39-42 39-71c0-9-3-18-8-25L65 57Z" fill="#0A63A8" />
        <circle cx="64" cy="47" r="21" fill="#F8FAFC" />
        <circle cx="64" cy="47" r="15" fill="#FFFFFF" />
        <path d="M15 83c19 11 57 9 90-10 15-9 24-19 22-26" fill="none" stroke="#071B34" strokeWidth="8" strokeLinecap="round" />
        <path d="M14 82c21 11 61 7 94-12 12-7 19-14 20-20" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        <path d="M16 89c23 10 68 4 105-20" fill="none" stroke="#071B34" strokeWidth="5" strokeLinecap="round" />
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071B34]">
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="link-ring flex min-w-0 items-center rounded-2xl" aria-label="Already Here LLC home">
          <InlineBrandMark />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
          {navItems.map((item) => <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />)}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={siteConfig.phoneHref} className="link-ring rounded-full border border-white/35 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
            {siteConfig.phoneDisplay}
          </a>
          <Link href="/rfq" className="link-ring rounded-full bg-[#1B66FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white hover:text-[#071B34]">
            Request Quote
          </Link>
        </div>

        <button type="button" className="link-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/45 text-white xl:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation">
          <span className="text-xl">{open ? '×' : '☰'}</span>
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-white/10 bg-[#071B34] xl:hidden">
          <div className="container-shell flex flex-col gap-3 py-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} data-active={active ? 'true' : 'false'} className={active ? 'link-ring rounded-2xl border border-[#1B66FF]/70 bg-[#020B15] px-4 py-3 text-sm font-semibold text-white' : 'link-ring rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:border-[#1B66FF] hover:bg-white/10'} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a href={siteConfig.phoneHref} className="link-ring rounded-2xl border border-white/45 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10" onClick={() => setOpen(false)}>
                {siteConfig.phoneDisplay}
              </a>
              <Link href="/rfq" className="link-ring rounded-2xl border border-[#1B66FF] bg-[#1B66FF] px-4 py-3 text-center text-sm font-semibold text-white" onClick={() => setOpen(false)}>
                Request Quote
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
