import { randomBytes } from "node:crypto";
import { authenticateTelegramUser, setSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientAddress, rateLimitResponse, validateAuthRequest } from "@/lib/request-security";
import { getTelegramBotId, getTelegramBotUsername, verifyTelegramAuthPayload } from "@/lib/telegram-auth";
import { cookies } from "next/headers";

const TELEGRAM_STATE_COOKIE = "lina_telegram_state";
const TELEGRAM_STATE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  let botId: string;
  let botUsername: string;
  try {
    botId = getTelegramBotId();
    botUsername = getTelegramBotUsername();
  } catch {
    return Response.json({ error: "Вход через Telegram пока не настроен" }, { status: 503 });
  }

  const state = randomBytes(32).toString("base64url");
  (await cookies()).set(TELEGRAM_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || process.env.AUTH_COOKIE_SECURE === "true",
    maxAge: TELEGRAM_STATE_MAX_AGE_SECONDS,
    path: "/api/auth/telegram/callback",
  });

  return Response.json({ botId, botUsername, state }, { headers: { "Cache-Control": "no-store" } });
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

  const telegramUser = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).telegramUser
    : null;
  if (!telegramUser || typeof telegramUser !== "object" || Array.isArray(telegramUser)) {
    return Response.json({ error: "Telegram не передал данные для входа" }, { status: 400 });
  }

  try {
    const identity = verifyTelegramAuthPayload(telegramUser as Record<string, unknown>);
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
