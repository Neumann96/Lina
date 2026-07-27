import type { Metadata } from "next";
import { HomeClient } from "@/components/home-client";
import { getAppShellData } from "@/lib/app-shell";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Новый набор");

export default async function NewSetPage() {
  const data = await getAppShellData("/app/sets/new");
  return <HomeClient {...data} initialActiveTab="create" />;
}
