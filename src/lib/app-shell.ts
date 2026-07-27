import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLibraryData } from "@/lib/folders";
import { getDashboardData } from "@/lib/learning";
import { loginPath } from "@/lib/navigation";

export async function getAppShellData(nextPath: string) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  if (!user) redirect(loginPath(nextPath));

  const [dashboard, library] = await Promise.all([
    getDashboardData(user.id),
    getLibraryData(user.id),
  ]);

  return {
    initialUser: user,
    initialDashboard: dashboard,
    initialLibrary: library,
    initialSidebarCollapsed: cookieStore.get("lina-sidebar-collapsed")?.value === "true",
  };
}
