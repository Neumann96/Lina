import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { authenticateTelegramUser, setSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientAddress, rateLimitResponse, validateAuthRequest } from "@/lib/request-security";
import { getTelegramClientId, verifyTelegramIdToken } from "@/lib/telegram-auth";

const NONCE_COOKIE = "lina_telegram_nonce";

function nonceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" || process.env.AUTH_COOKIE_SECURE === "true",
    maxAge: 10 * 60,
    path: "/",
  };
}

export async function GET(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  let clientId: string;
  try {
    clientId = getTelegramClientId();
  } catch {
    return Response.json({ error: "Вход через Telegram пока не настроен" }, { status: 503 });
  }

  const nonce = randomBytes(32).toString("base64url");
  (await cookies()).set(NONCE_COOKIE, nonce, nonceCookieOptions());
  return Response.json({ clientId, nonce }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const ipLimit = await consumeRateLimit(getClientAddress(request), {
    scope: "telegram-ip",
    limit: 20,
    windowSeconds: 15 * 60,
  });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const idToken = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).idToken
    : null;
  if (typeof idToken !== "string" || idToken.length > 10_000) {
    return Response.json({ error: "Telegram не передал данные для входа" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const expectedNonce = cookieStore.get(NONCE_COOKIE)?.value;
  cookieStore.delete(NONCE_COOKIE);
  if (!expectedNonce) {
    return Response.json({ error: "Сессия входа устарела. Попробуйте ещё раз" }, { status: 400 });
  }

  try {
    const identity = await verifyTelegramIdToken(idToken, expectedNonce);
    const telegramLimit = await consumeRateLimit(identity.telegramId, {
      scope: "telegram-user",
      limit: 10,
      windowSeconds: 15 * 60,
    });
    if (!telegramLimit.allowed) return rateLimitResponse(telegramLimit.retryAfter);

    const user = await authenticateTelegramUser(identity.telegramId, identity.name);
    await setSession(user);
    return Response.json({ user });
  } catch {
    return Response.json({ error: "Не удалось подтвердить вход через Telegram" }, { status: 401 });
  }
}
