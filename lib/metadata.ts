import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { defaultOgImage } from "@/lib/og";

type PageMetadataInput = {
  title: string;
  description: string;
  path?: string;
};

export function createPageMetadata({
  title,
  description,
  path = "/",
}: PageMetadataInput): Metadata {
  const url = new URL(path, siteConfig.url);

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      images: [defaultOgImage],
      type: "website",
      url,
      title,
      description,
      siteName: siteConfig.name,
    },
    twitter: {
      images: [defaultOgImage],
      card: "summary_large_image",
      title,
      description,
    },
  };
}
