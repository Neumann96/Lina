import { notFound, redirect } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { getCurrentUser } from "@/lib/auth";
import { getStudySet } from "@/lib/learning";

export default async function StudyPage({ params }: { params: Promise<{ setId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { setId } = await params;
  const studySet = await getStudySet(user.id, setId);
  if (!studySet) notFound();

  return <StudySession studySet={studySet} />;
}
