import { notFound, redirect } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { getCurrentUser } from "@/lib/auth";
import { getDueReviewStudySet, type ReviewScopeKind } from "@/lib/review-groups";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ScopedReviewStudyPage({
  params,
}: {
  params: Promise<{ scopeKind: string; scopeId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { scopeKind, scopeId } = await params;
  if ((scopeKind !== "set" && scopeKind !== "folder") || !UUID_PATTERN.test(scopeId)) notFound();

  const studySet = await getDueReviewStudySet(user.id, scopeKind as ReviewScopeKind, scopeId);
  if (!studySet) notFound();

  return <StudySession studySet={studySet} />;
}
