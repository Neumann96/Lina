import { permanentRedirect } from "next/navigation";

export default function LegacyReviewsPage() {
  permanentRedirect("/app/reviews");
}
