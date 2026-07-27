import { permanentRedirect } from "next/navigation";

export default async function LegacyScopedReviewPage({
  params,
}: PageProps<"/study/reviews/[scopeKind]/[scopeId]">) {
  const { scopeKind, scopeId } = await params;
  permanentRedirect(`/app/reviews/${scopeKind}/${scopeId}`);
}
