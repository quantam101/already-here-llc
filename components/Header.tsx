'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { siteConfig } from '@/lib/site';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/who-we-serve', label: 'Who We Serve' },
  { href: '/contact', label: 'Dispatch' }
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
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Field execution partner</div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-2 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/services"
            className="link-ring rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-navy transition hover:border-action hover:text-action"
          >
            View Services
          </Link>
          <Link
            href="/contact"
            className="link-ring rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy"
          >
            Request Dispatch
          </Link>
        </div>

        <button
          type="button"
          className="link-ring inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-borderBrand text-navy lg:hidden"
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
                Check Coverage
              </Link>
              <Link
                href="/contact"
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
