import { permanentRedirect } from "next/navigation";

export default async function LegacyStudyPage({ params }: PageProps<"/study/[setId]">) {
  const { setId } = await params;
  permanentRedirect(`/app/study/${setId}`);
}
