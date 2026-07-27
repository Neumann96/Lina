import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GuestLanding } from "@/components/home-client";
import { getCurrentUser } from "@/lib/auth";
import { safeAppPath } from "@/lib/navigation";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Вход");

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const nextPath = safeAppPath(query.next);
  if (user) redirect(nextPath);

  const telegramError = query.telegramAuth === "limited"
    ? "Слишком много попыток. Попробуйте позже"
    : query.telegramAuth === "failed"
      ? "Не удалось подтвердить вход через Telegram"
      : "";

  return <GuestLanding initialAuthMode="login" authNextPath={nextPath} telegramError={telegramError} />;
}
