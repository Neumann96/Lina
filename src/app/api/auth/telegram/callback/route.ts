import { authenticateTelegramUser, setSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientAddress, validateAuthRequest } from "@/lib/request-security";
import { verifyTelegramAuthPayload } from "@/lib/telegram-auth";

function redirectHome(request: Request, status?: "failed" | "limited") {
  const url = new URL("/", request.url);
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

  const payload = Object.fromEntries(new URL(request.url).searchParams.entries());
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
