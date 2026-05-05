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
    <Link
      href={href}
      className={`link-ring rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-navy text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-navy'
      }`}
    >
      {label}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-borderBrand/80 bg-white/95 backdrop-blur">
      <div className="container-shell flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="link-ring flex items-center gap-3 rounded-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-sm font-bold tracking-[0.16em] text-white">
              AH
            </div>
            <div>
              <div className="text-base font-semibold text-navy">{siteConfig.name}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Field execution partner</span>
                <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700">
                  SDVOSB
                </span>
              </div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={siteConfig.phoneHref}
            className="link-ring flex items-center gap-2 rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-navy transition hover:border-action hover:text-action"
            aria-label="Call for urgent same-day dispatch"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M1.5 2C1.5 2 2.5 4.5 4.5 6.5S8.5 10 8.5 10l1.25-1.25c.45-.45 1.05-.35 1.35.1l.8 1.2c.3.45.1 1.05-.35 1.35C9.5 12.5 8 13.5 6 12.5 3 11 1 8 1 5 0 3 1 1.5 2.05 1.05c.5-.25 1.05-.05 1.35.45l.8 1.2c.3.45.2 1.05-.25 1.35Z" fill="currentColor"/>
            </svg>
            {siteConfig.phoneDisplay}
          </a>
          <Link
            href="/dispatch"
            className="link-ring rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy"
          >
            Request Dispatch
          </Link>
        </div>

        <button
          type="button"
          className="link-ring inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-borderBrand text-navy lg:hidden"
          onClick={() => setOpen((c) => !c)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
        >
          <span className="text-xl">{open ? '×' : '☰'}</span>
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-borderBrand bg-white lg:hidden">
          <div className="container-shell flex flex-col gap-3 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`link-ring rounded-2xl px-4 py-3 text-sm font-medium ${
                  pathname === item.href ? 'bg-navy text-white' : 'bg-slate-50 text-navy'
                }`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={siteConfig.phoneHref}
                className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-center text-sm font-medium text-navy"
                onClick={() => setOpen(false)}
              >
                {siteConfig.phoneDisplay}
              </a>
              <Link
                href="/dispatch"
                className="link-ring rounded-2xl bg-action px-4 py-3 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Request Dispatch
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
