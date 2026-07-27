import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GuestLanding } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";
import { safeAppPath } from "@/lib/navigation";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Регистрация");

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const nextPath = safeAppPath(query.next);
  if (user) redirect(nextPath);

  return <GuestLanding initialAuthMode="register" authNextPath={nextPath} />;
}
