import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { getCurrentUser } from "@/lib/auth";
import { loginPath } from "@/lib/navigation";
import { getDueReviewStudySet, type ReviewScopeKind } from "@/lib/review-groups";
import { privatePageMetadata } from "@/lib/seo";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const metadata: Metadata = privatePageMetadata("Очередь повторения");

export default async function AppScopedReviewPage({
  params,
}: PageProps<"/app/reviews/[scopeKind]/[scopeId]">) {
  const { scopeKind, scopeId } = await params;
  const nextPath = `/app/reviews/${scopeKind}/${scopeId}`;
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(nextPath));

  if (scopeKind === "set" && UUID_PATTERN.test(scopeId)) redirect("/app/reviews/unfiled/all");
  if (
    (scopeKind === "folder" && !UUID_PATTERN.test(scopeId))
    || (scopeKind === "unfiled" && scopeId !== "all")
    || (scopeKind !== "folder" && scopeKind !== "unfiled")
  ) notFound();

  const studySet = await getDueReviewStudySet(user.id, scopeKind as ReviewScopeKind, scopeId);
  if (!studySet) notFound();
  return <StudySession studySet={studySet} />;
}
