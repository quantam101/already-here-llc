import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

const routes = [
  "/",
  "/dispatch",
  "/services",
  "/request-coverage",
  "/for-agencies-service-providers",
  "/who-we-serve",
  "/service-area",
  "/rollout-support",
  "/privacy",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: new URL(route, siteConfig.url).toString(),
    lastModified: now,
    changeFrequency: route === "/privacy" ? "yearly" : "weekly",
    priority:
      route === "/"
        ? 1
        : route === "/dispatch"
          ? 0.95
          : route === "/services"
            ? 0.9
            : route === "/request-coverage" || route === "/for-agencies-service-providers"
              ? 0.86
              : route === "/who-we-serve"
                ? 0.84
                : route === "/service-area"
                  ? 0.82
                  : route === "/rollout-support"
                    ? 0.8
                    : 0.3
  }));
}
