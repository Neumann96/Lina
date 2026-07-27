import { permanentRedirect } from "next/navigation";

export default function LegacyLibraryPage() {
  permanentRedirect("/app/library");
}
