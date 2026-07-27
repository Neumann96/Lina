import type { Metadata } from "next";
import { GuestLanding } from "@/components/home-client";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Figma import");

export default function FigmaImportPage() {
  return <GuestLanding />;
}
