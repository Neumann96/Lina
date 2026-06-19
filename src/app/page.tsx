import { HomeClient } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  return <HomeClient initialUser={await getCurrentUser()} />;
}
