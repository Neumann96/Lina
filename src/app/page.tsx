import { HomeClient } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/learning";

export default async function Home() {
  const user = await getCurrentUser();
  const dashboard = user ? await getDashboardData(user.id) : null;
  return <HomeClient initialUser={user} initialDashboard={dashboard} />;
}
