import { getCurrentUser } from "@/lib/auth";
import { recordCardReview } from "@/lib/learning";
import { consumeRateLimit } from "@/lib/rate-limit";
import { rateLimitResponse, validateAuthRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Войдите, чтобы продолжить" }, { status: 401 });

  const userLimit = await consumeRateLimit(user.id, {
    scope: "reviews-user",
    limit: 600,
    windowSeconds: 15 * 60,
  });
  if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const values = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const cardId = typeof values.cardId === "string" ? values.cardId : "";
  const isCorrect = values.isCorrect;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cardId) || typeof isCorrect !== "boolean") {
    return Response.json({ error: "Некорректный ответ" }, { status: 400 });
  }

  const saved = await recordCardReview(user.id, cardId, isCorrect);
  return saved
    ? Response.json({ saved: true }, { status: 201 })
    : Response.json({ error: "Карточка не найдена" }, { status: 404 });
}
