// app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { buildMetadata, organizationJsonLd, safeJsonLd } from "@/lib/site";

export const metadata: Metadata = buildMetadata("/");

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(organizationJsonLd),
          }}
        />

        <Suspense fallback={null}>
          <Header />
        </Suspense>

        {children}

        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}