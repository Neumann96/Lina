import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDueReviewGroups } from "@/lib/review-groups";

export default async function ReviewStudyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [firstGroup] = await getDueReviewGroups(user.id);
  redirect(firstGroup?.href ?? "/");
}
