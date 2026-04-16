import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Already Here LLC | Field Execution Partner",
    template: "%s | Already Here LLC",
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    url: siteConfig.url,
    title: "Already Here LLC | Field Execution Partner",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Already Here LLC | Field Execution Partner",
    description: siteConfig.description,
  },
};

const primaryNav = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Who We Serve", href: "/who-we-serve" },
  { label: "Service Area", href: "/service-area" },
  { label: "Dispatch", href: "/dispatch" },
];

const secondaryLinks = [
  { label: "Rollout Support", href: "/rollout-support" },
  { label: "Privacy Policy", href: "/privacy" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.email,
    areaServed: ["Phoenix, Arizona", "Arizona"],
  };

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-950 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
        />

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    <Image
                      src="/logo.png"
                      alt="Already Here LLC logo"
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      priority
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

                    <Link
                      href="/dispatch"
                      className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Open Dispatch
                    </Link>
                  </nav>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
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
                      {primaryNav.map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} className="text-slate-700 hover:text-slate-950">
                            {item.label}
                          </Link>
                        </li>
                      ))}
                      {secondaryLinks.map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} className="text-slate-700 hover:text-slate-950">
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Direct contact
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-950">{siteConfig.email}</p>
                      <p>{siteConfig.city}</p>
                      <p>Use the dispatch form as the primary intake path for scope, timing, and site details.</p>
                    </div>

                    <div className="mt-5 space-y-3">
                      <Link
                        href="/dispatch"
                        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Open Dispatch
                      </Link>
                      <p className="text-sm leading-6 text-slate-600">
                        Existing threads can still use{" "}
                        <a
                          href={`mailto:${siteConfig.email}`}
                          className="font-medium text-slate-950 underline decoration-slate-300 underline-offset-4"
                        >
                          {siteConfig.email}
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
                © {new Date().getFullYear()} Already Here LLC. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
