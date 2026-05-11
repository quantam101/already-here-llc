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
  { href: '/capability-statement', label: 'Capability Statement' },
  { href: '/blog', label: 'Field Insights' },
  { href: '/dispatch', label: 'Dispatch' }
];

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`link-ring rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-[#071B34] text-white' : 'text-[#071B34] hover:bg-slate-100 hover:text-[#071B34]'
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
    <header className="sticky top-0 z-50 border-b border-[#071B34]/30 bg-white">
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="link-ring flex min-w-0 items-center rounded-2xl" aria-label="Already Here LLC home">
          <BrandMark
            className="min-w-0"
            tagline="ONSITE INFRASTRUCTURE EXECUTION"
            textColorClassName="text-[#071B34]"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={siteConfig.phoneHref}
            className="link-ring flex items-center gap-2 rounded-full border border-[#071B34] bg-white px-4 py-2 text-sm font-semibold text-[#071B34] transition hover:border-action hover:text-action"
            aria-label="Call for urgent same-day dispatch"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M1.5 2C1.5 2 2.5 4.5 4.5 6.5S8.5 10 8.5 10l1.25-1.25c.45-.45 1.05-.35 1.35.1l.8 1.2c.3.45.1 1.05-.35 1.35C9.5 12.5 8 13.5 6 12.5 3 11 1 8 1 5 0 3 1 1.5 2.05 1.05c.5-.25 1.05-.05 1.35.45l.8 1.2c.3.45.2 1.05-.25 1.35Z" fill="currentColor" />
            </svg>
            {siteConfig.phoneDisplay}
          </a>
          <Link
            href="/dispatch"
            className="link-ring rounded-full bg-[#1B66FF] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#071B34]"
          >
            Request Dispatch
          </Link>
        </div>

        <button
          type="button"
          className="link-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#071B34] bg-white text-[#071B34] lg:hidden"
          onClick={() => setOpen((c) => !c)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
        >
          <span className="text-xl">{open ? '×' : '☰'}</span>
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-[#071B34]/30 bg-white shadow-[0_24px_60px_rgba(7,27,52,0.22)] lg:hidden">
          <div className="container-shell flex flex-col gap-3 py-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  data-active={active ? 'true' : 'false'}
                  className={active
                    ? 'link-ring rounded-2xl border border-[#071B34] bg-[#071B34] px-4 py-3 text-sm font-semibold text-white opacity-100'
                    : 'link-ring rounded-2xl border border-[#D5DBE3] bg-white px-4 py-3 text-sm font-semibold text-[#071B34] opacity-100 shadow-sm hover:border-[#1B66FF] hover:bg-slate-50 hover:text-[#1B66FF]'}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={siteConfig.phoneHref}
                className="link-ring rounded-2xl border border-[#071B34] bg-white px-4 py-3 text-center text-sm font-semibold text-[#071B34] opacity-100 shadow-sm"
                onClick={() => setOpen(false)}
              >
                {siteConfig.phoneDisplay}
              </a>
              <Link
                href="/dispatch"
                className="link-ring rounded-2xl border border-[#1B66FF] bg-[#1B66FF] px-4 py-3 text-center text-sm font-semibold text-white opacity-100 shadow-sm"
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
