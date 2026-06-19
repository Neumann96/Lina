import { authenticateTelegramUser, setSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientAddress, rateLimitResponse, validateAuthRequest } from "@/lib/request-security";
import { getTelegramBotId, verifyTelegramAuthPayload } from "@/lib/telegram-auth";

export async function GET(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  let botId: string;
  try {
    botId = getTelegramBotId();
  } catch {
    return Response.json({ error: "Вход через Telegram пока не настроен" }, { status: 503 });
  }

  return Response.json({ botId }, { headers: { "Cache-Control": "no-store" } });
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
