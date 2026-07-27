import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginPath } from "@/lib/navigation";
import { getDueReviewGroups } from "@/lib/review-groups";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Повторение");

export default async function AppReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath("/app/reviews"));

  const firstGroup = (await getDueReviewGroups(user.id))[0];
  redirect(firstGroup?.href ?? "/app");
}
