import { redirect } from "next/navigation";
import { FolderLibrary } from "@/components/folder-library";
import { getCurrentUser } from "@/lib/auth";
import { getLibraryData } from "@/lib/folders";

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const library = await getLibraryData(user.id);
  return <FolderLibrary initialLibrary={library} />;
}
