import type { Metadata } from "next";
import { HomeClient } from "@/components/home-client";
import { getAppShellData } from "@/lib/app-shell";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Папки");

export default async function AppLibraryPage() {
  const data = await getAppShellData("/app/library");
  return <HomeClient {...data} initialActiveTab="library" />;
}
