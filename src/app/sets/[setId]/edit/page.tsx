import { permanentRedirect } from "next/navigation";

export default async function LegacyEditSetPage({ params }: PageProps<"/sets/[setId]/edit">) {
  const { setId } = await params;
  permanentRedirect(`/app/sets/${setId}/edit`);
}
