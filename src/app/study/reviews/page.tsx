import { redirect } from "next/navigation";
import { StudySession } from "@/components/study-session";
import { getCurrentUser } from "@/lib/auth";
import { getDueReviewStudySet } from "@/lib/review-groups";

export default async function ReviewStudyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const studySet = await getDueReviewStudySet(user.id);
  return <StudySession studySet={studySet} />;
}
