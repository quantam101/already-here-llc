'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { siteConfig } from '@/lib/site';

const navGroups = [
  {
    label: 'Services',
    items: [
      { href: '/services#managed-it', label: 'Managed IT Services' },
      { href: '/services#security', label: 'Cybersecurity & Security' },
      { href: '/services#cloud', label: 'Microsoft 365 & Cloud' },
      { href: '/services#infrastructure', label: 'Network & Infrastructure' },
      { href: '/services#field-operations', label: 'Onsite Field Operations' },
    ],
  },
  {
    label: 'Who We Serve',
    items: [
      { href: '/who-we-serve', label: 'Businesses & IT Teams' },
      { href: '/industries', label: 'Industries' },
      { href: '/government-contracting', label: 'Government & Primes' },
      { href: '/rollout-support', label: 'Multi-Site Projects' },
    ],
  },
  {
    label: 'Proof',
    items: [
      { href: '/capability-statement', label: 'Capability Statement' },
      { href: '/project-gallery', label: 'Project Gallery' },
      { href: '/coverage', label: 'Coverage Area' },
      { href: '/blog', label: 'IT & Field Insights' },
    ],
  },
  {
    label: 'Support',
    items: [
      { href: '/dispatch', label: 'Request IT Support' },
      { href: '/emergency-dispatch', label: 'Same-Day Onsite Support' },
      { href: '/rfq', label: 'Project RFQ' },
      { href: '/dashboard', label: 'Operations Portal' },
    ],
  },
];

const mobileNavGroups = navGroups.map((group) => ({ heading: group.label, items: group.items }));

function pathFor(href: string) {
  return href.split('#')[0];
}

function DropdownGroup({ group, pathname }: { group: typeof navGroups[number]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = group.items.some((item) => pathname === pathFor(item.href));

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        aria-expanded={open}
        className={`link-ring inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
          isActive ? 'bg-white text-[#071B34]' : 'text-white hover:bg-white/10'
        }`}
      >
        {group.label}
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[230px] rounded-2xl border border-white/15 bg-[#071B34] py-2 shadow-2xl">
          {group.items.map((item) => {
            const active = pathname === pathFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block px-4 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071B34]">
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="link-ring flex min-w-0 items-center rounded-2xl" aria-label="Already Here LLC home">
          <BrandMark className="min-w-0" tagline="MANAGED IT + FIELD OPERATIONS" textColorClassName="text-white" />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <DropdownGroup key={group.label} group={group} pathname={pathname} />
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={siteConfig.phoneHref} className="link-ring rounded-full border border-white/35 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
            {siteConfig.phoneDisplay}
          </a>
          <Link href="/dispatch" className="link-ring rounded-full bg-[#1B66FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white hover:text-[#071B34]">
            Request IT Support
          </Link>
        </div>

        <button
          type="button"
          className="link-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/45 text-white xl:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
        >
          <span className="text-sm font-semibold" aria-hidden="true">{open ? 'Close' : 'Menu'}</span>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-white/10 bg-[#071B34] xl:hidden">
          <div className="container-shell flex flex-col gap-5 py-5">
            {mobileNavGroups.map((group) => (
              <div key={group.heading}>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{group.heading}</p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const active = pathname === pathFor(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`link-ring rounded-2xl border px-4 py-3 text-sm font-semibold text-white ${
                          active ? 'border-[#1B66FF]/70 bg-[#020B15]' : 'border-white/20 bg-white/5 hover:border-[#1B66FF] hover:bg-white/10'
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
              <a
                href={siteConfig.phoneHref}
                className="link-ring rounded-2xl border border-white/45 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                {siteConfig.phoneDisplay}
              </a>
              <Link
                href="/dispatch"
                className="link-ring rounded-2xl border border-[#1B66FF] bg-[#1B66FF] px-4 py-3 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Request IT Support
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
