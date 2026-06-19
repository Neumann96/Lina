import { authenticateUser, normalizeEmail, setSession, validateEmail } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientAddress, rateLimitResponse, validateAuthRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const ipLimit = await consumeRateLimit(getClientAddress(request), {
    scope: "login-ip",
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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  const email = normalizeEmail(typeof values.email === "string" ? values.email : "");
  const password = typeof values.password === "string" ? values.password : "";
  const emailError = validateEmail(email);
  if (emailError) return Response.json({ error: emailError, field: "email" }, { status: 400 });
  if (!password) return Response.json({ error: "Введите пароль", field: "password" }, { status: 400 });

  const emailLimit = await consumeRateLimit(email, {
    scope: "login-email",
    limit: 10,
    windowSeconds: 15 * 60,
  });
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfter);

  const user = await authenticateUser(email, password);
  if (!user) return Response.json({ error: "Неверная почта или пароль" }, { status: 401 });
  await setSession(user);
  return Response.json({ user });
}
