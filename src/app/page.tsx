import { HomeClient } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/learning";
import { cookies } from "next/headers";

export default async function Home() {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  const dashboard = user ? await getDashboardData(user.id) : null;
  const initialSidebarCollapsed = cookieStore.get("lina-sidebar-collapsed")?.value === "true";

  return (
    <HomeClient
      initialUser={user}
      initialDashboard={dashboard}
      initialSidebarCollapsed={initialSidebarCollapsed}
    />
  );
}
