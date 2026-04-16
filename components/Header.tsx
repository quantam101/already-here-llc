'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { siteConfig } from '@/lib/site';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/who-we-serve', label: 'Who We Serve' },
  { href: '/dispatch', label: 'Dispatch' }
];

function NavLink({
  href,
  label,
  pathname
}: {
  href: string;
  label: string;
  pathname: string;
}) {
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
      <div className="container-shell flex items-center justify-between gap-4 py-4 lg:gap-8">
        <Link href="/" className="link-ring flex min-w-0 items-center gap-3 rounded-2xl">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm sm:h-14 sm:w-14">
            <Image
              src="/logo.png"
              alt="Already Here LLC logo"
              fill
              className="object-contain p-0.5"
              priority
            />
          </div>

          <div className="min-w-0">
            <div className="truncate text-lg font-semibold leading-none text-navy">
              {siteConfig.name}
            </div>
            <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-slate-500 sm:text-xs">
              Field Execution Partner
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 xl:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/services"
            className="link-ring rounded-full border border-borderBrand px-5 py-2.5 text-sm font-medium text-navy transition hover:border-action hover:text-action"
          >
            View Services
          </Link>
          <Link
            href="/dispatch"
            className="link-ring rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy"
          >
            Open Dispatch
          </Link>
        </div>

        <button
          type="button"
          className="link-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-borderBrand text-navy lg:hidden"
          onClick={() => setOpen((current) => !current)}
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
              <Link
                href="/services"
                className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-center text-sm font-medium text-navy"
                onClick={() => setOpen(false)}
              >
                View Services
              </Link>
              <Link
                href="/dispatch"
                className="link-ring rounded-2xl bg-action px-4 py-3 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Open Dispatch
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
