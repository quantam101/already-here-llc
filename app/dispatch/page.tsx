import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import DispatchPageClient from "./DispatchPageClient";

export const metadata: Metadata = createPageMetadata({
  title: "Dispatch Intake",
  description:
    "Submit a structured dispatch request with site, timing, contact, billing, and scope details for Phoenix and Arizona field execution.",
  path: "/dispatch",
});

export default function DispatchPage() {
  return <DispatchPageClient />;
}
