import { timingSafeEqual } from "node:crypto";
import { authenticateTelegramUser, setSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientAddress, validateAuthRequest } from "@/lib/request-security";
import { verifyTelegramAuthPayload } from "@/lib/telegram-auth";
import { cookies } from "next/headers";

const TELEGRAM_STATE_COOKIE = "lina_telegram_state";

function statesMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function redirectHome(request: Request, status?: "failed" | "limited") {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  const url = new URL("/", configuredOrigin || new URL(request.url).origin);
  if (status) url.searchParams.set("telegramAuth", status);
  return Response.redirect(url, 303);
}

export async function GET(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const ipLimit = await consumeRateLimit(getClientAddress(request), {
    scope: "telegram-ip",
    limit: 20,
    windowSeconds: 15 * 60,
  });
  if (!ipLimit.allowed) return redirectHome(request, "limited");

  const cookieStore = await cookies();
  const url = new URL(request.url);
  const receivedState = url.searchParams.get("state") ?? "";
  const expectedState = cookieStore.get(TELEGRAM_STATE_COOKIE)?.value ?? "";
  cookieStore.set(TELEGRAM_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || process.env.AUTH_COOKIE_SECURE === "true",
    maxAge: 0,
    path: "/api/auth/telegram/callback",
  });
  if (!receivedState || !expectedState || !statesMatch(receivedState, expectedState)) {
    return redirectHome(request, "failed");
  }

  url.searchParams.delete("state");
  const payload = Object.fromEntries(url.searchParams.entries());
  try {
    const identity = verifyTelegramAuthPayload(payload);
    const telegramLimit = await consumeRateLimit(identity.telegramId, {
      scope: "telegram-user",
      limit: 10,
      windowSeconds: 15 * 60,
    });
    if (!telegramLimit.allowed) return redirectHome(request, "limited");

    const user = await authenticateTelegramUser(identity.telegramId, identity.name);
    await setSession(user);
  } catch {
    return redirectHome(request, "failed");
  }

  return redirectHome(request);
}
