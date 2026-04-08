import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.alreadyherellc.com'),
  title: {
    default: 'Already Here LLC | Field Execution Partner',
    template: '%s | Already Here LLC',
  },
  description:
    'Phoenix-based, Arizona-first onsite technical field execution for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs.',
};

const primaryNav = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Who We Serve', href: '/who-we-serve' },
  { label: 'Dispatch', href: '/contact' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-950 antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    <img
                      src="/logo.png"
                      alt="Already Here LLC logo"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <Link href="/" className="text-2xl font-bold tracking-tight text-slate-950">
                      Already Here LLC
                    </Link>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Field Execution Partner
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 lg:items-end">
                  <p className="text-sm font-medium text-slate-600">
                    Phoenix-based • Commercially insured • Structured closeout
                  </p>

                  <nav className="flex flex-wrap gap-2">
                    {primaryNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        {item.label}
                      </Link>
                    ))}

                    <a
                      href="mailto:dispatch@alreadyherellc.com"
                      className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Email Dispatch
                    </a>
                  </nav>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Already Here LLC
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                    Phoenix-based field execution partner for remote teams, MSPs, vendors,
                    healthcare-adjacent operators, and rollout programs.
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
                    Arizona-first onsite technical field execution with qualified regional and
                    project-based travel support for the right scope.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">
                      Phoenix-based
                    </span>
                    <span className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">
                      Commercially insured
                    </span>
                    <span className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">
                      Structured closeout
                    </span>
                  </div>
                </div>

                <div className="grid gap-8 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Navigation
                    </p>
                    <ul className="mt-4 space-y-3 text-sm">
                      <li>
                        <Link href="/" className="text-slate-700 hover:text-slate-950">
                          Home
                        </Link>
                      </li>
                      <li>
                        <Link href="/services" className="text-slate-700 hover:text-slate-950">
                          Services
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/who-we-serve"
                          className="text-slate-700 hover:text-slate-950"
                        >
                          Who We Serve
                        </Link>
                      </li>
                      <li>
                        <Link href="/contact" className="text-slate-700 hover:text-slate-950">
                          Dispatch
                        </Link>
                      </li>
                      <li>
                        <Link href="/privacy" className="text-slate-700 hover:text-slate-950">
                          Privacy Policy
                        </Link>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Direct contact
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-950">dispatch@alreadyherellc.com</p>
                      <p>Phoenix, Arizona</p>
                      <p>Use the dispatch page for site details, timing, scope, and notes.</p>
                    </div>

                    <div className="mt-5">
                      <a
                        href="mailto:dispatch@alreadyherellc.com"
                        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Email Dispatch
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
                © 2026 Already Here LLC. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
