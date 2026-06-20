import { authenticateTelegramUser, setSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientAddress, rateLimitResponse, validateAuthRequest } from "@/lib/request-security";
import { verifyTelegramMiniAppData } from "@/lib/telegram-auth";

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const ipLimit = await consumeRateLimit(getClientAddress(request), {
    scope: "telegram-ip",
    limit: 20,
    windowSeconds: 15 * 60,
  });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfter);

  let initData = "";
  try {
    const body = await request.json() as { initData?: unknown };
    initData = typeof body.initData === "string" ? body.initData : "";
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    const identity = verifyTelegramMiniAppData(initData);
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
    return Response.json({ error: "Не удалось подтвердить запуск через Telegram" }, { status: 401 });
  }
}
