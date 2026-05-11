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

function LogoMark() {
  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16">
        <svg viewBox="0 0 96 96" className="h-full w-full" role="img" aria-label="Already Here LLC location orbit mark">
          <path d="M48 6C31.984 6 19 18.984 19 35c0 22.5 29 55 29 55s29-32.5 29-55C77 18.984 64.016 6 48 6Z" fill="#071B34" />
          <path d="M48 6c16.016 0 29 12.984 29 29 0 22.5-29 55-29 55V6Z" fill="#0B559F" />
          <path d="M48 17c9.941 0 18 8.059 18 18s-8.059 18-18 18-18-8.059-18-18 8.059-18 18-18Z" fill="#FFFFFF" />
          <path d="M14 55c15 13 51 14 70-5" stroke="#071B34" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M14 55c15 13 51 14 70-5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M17 58c18 10 50 10 73-10" stroke="#1B66FF" strokeWidth="2.75" strokeLinecap="round" fill="none" opacity="0.85" />
        </svg>
      </div>
      <div className="min-w-0 leading-none">
        <div className="truncate text-[1.05rem] font-semibold uppercase tracking-[0.35em] text-[#071B34] sm:text-2xl sm:tracking-[0.42em]">
          Already Here LLC
        </div>
        <div className="mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.38em] text-[#7E8A9A] sm:text-sm sm:tracking-[0.45em]">
          Onsite Infrastructure Execution
        </div>
      </div>
    </div>
  );
}

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
    <header className="sticky top-0 z-50 border-b border-[#071B34]/30 bg-white backdrop-blur">
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="link-ring min-w-0 rounded-2xl" aria-label="Already Here LLC home">
          <LogoMark />
        </Link>

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
            {siteConfig.phoneDisplay}
          </a>
          <Link href="/dispatch" className="link-ring rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy">
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
                  className={`link-ring rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? 'border-[#071B34] bg-[#071B34] text-white'
                      : 'border-[#D5DBE3] bg-white text-[#071B34] shadow-sm hover:border-[#1B66FF] hover:bg-slate-50 hover:text-[#1B66FF]'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={siteConfig.phoneHref}
                className="link-ring rounded-2xl border border-[#071B34] bg-white px-4 py-3 text-center text-sm font-semibold text-[#071B34] shadow-sm"
                onClick={() => setOpen(false)}
              >
                {siteConfig.phoneDisplay}
              </a>
              <Link
                href="/dispatch"
                className="link-ring rounded-2xl bg-[#1B66FF] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm"
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
