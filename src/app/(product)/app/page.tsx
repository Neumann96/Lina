import type { Metadata } from "next";
import { HomeClient } from "@/components/home-client";
import { getAppShellData } from "@/lib/app-shell";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Главная");

export default async function AppPage() {
  const data = await getAppShellData("/app");
  return <HomeClient {...data} initialActiveTab="home" />;
}
