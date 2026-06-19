import "server-only";

export function getClientAddress(request: Request) {
  const address = request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    ?? "unknown";
  return address.slice(0, 64);
}

export function validateAuthRequest(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const requiresOrigin = !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());

  if (origin) {
    try {
      if (!host || new URL(origin).host !== host) {
        return Response.json({ error: "Недопустимый источник запроса" }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Недопустимый источник запроса" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production" && requiresOrigin) {
    return Response.json({ error: "Не указан источник запроса" }, { status: 403 });
  }

  if (process.env.NODE_ENV === "production") {
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    if (forwardedProtocol !== "https" && new URL(request.url).protocol !== "https:") {
      return Response.json({ error: "Для авторизации требуется HTTPS" }, { status: 400 });
    }
  }

  return null;
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: "Слишком много попыток. Попробуйте позже" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
