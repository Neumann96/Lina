import { HomeClient } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";
import { getLibraryData } from "@/lib/folders";
import { getDashboardData } from "@/lib/learning";
import { cookies } from "next/headers";

export default async function Home() {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  const [dashboard, library] = user
    ? await Promise.all([getDashboardData(user.id), getLibraryData(user.id)])
    : [null, null];
  const initialSidebarCollapsed = cookieStore.get("lina-sidebar-collapsed")?.value === "true";

  return (
    <HomeClient
      initialUser={user}
      initialDashboard={dashboard}
      initialLibrary={library}
      initialSidebarCollapsed={initialSidebarCollapsed}
    />
  );
}
