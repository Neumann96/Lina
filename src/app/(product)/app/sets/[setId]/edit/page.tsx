import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EditStudySet } from "@/components/edit-study-set";
import { getCurrentUser } from "@/lib/auth";
import { getStudySet } from "@/lib/learning";
import { loginPath } from "@/lib/navigation";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Редактирование набора");

export default async function AppEditSetPage({ params }: PageProps<"/app/sets/[setId]/edit">) {
  const { setId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(`/app/sets/${setId}/edit`));

  const studySet = await getStudySet(user.id, setId);
  if (!studySet) notFound();
  return <EditStudySet studySet={studySet} />;
}
