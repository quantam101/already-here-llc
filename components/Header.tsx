'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
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

function DesktopNavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={active ? 'link-ring rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#071B34]' : 'link-ring rounded-full px-3 py-2 text-sm font-semibold text-white hover:bg-white/10'}>
      {label}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071B34]">
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="link-ring flex min-w-0 items-center rounded-2xl" aria-label="Already Here LLC home">
          <BrandMark className="min-w-0" tagline="ONSITE INFRASTRUCTURE EXECUTION" textColorClassName="text-white" />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
          {navItems.map((item) => <DesktopNavLink key={item.href} {...item} pathname={pathname ?? '/'} />)}
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
          <span className="text-xl">{open ? 'Ã' : 'â°'}</span>
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
