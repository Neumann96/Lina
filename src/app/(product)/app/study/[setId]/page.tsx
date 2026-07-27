import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { getCurrentUser } from "@/lib/auth";
import { getStudySet } from "@/lib/learning";
import { loginPath } from "@/lib/navigation";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Занятие");

export default async function AppStudyPage({ params }: PageProps<"/app/study/[setId]">) {
  const { setId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(`/app/study/${setId}`));

  const studySet = await getStudySet(user.id, setId);
  if (!studySet) notFound();
  return <StudySession studySet={studySet} />;
}
