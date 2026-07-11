import { getCurrentUser } from "@/lib/auth";
import { restartStudySet } from "@/lib/learning";
import { consumeRateLimit } from "@/lib/rate-limit";
import { rateLimitResponse, validateAuthRequest } from "@/lib/request-security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Войдите, чтобы продолжить" }, { status: 401 });

  const userLimit = await consumeRateLimit(user.id, {
    scope: "restart-user",
    limit: 30,
    windowSeconds: 15 * 60,
  });
  if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfter);

  const { setId } = await params;
  if (!UUID_PATTERN.test(setId)) {
    return Response.json({ error: "Некорректный набор" }, { status: 400 });
  }

  const restarted = await restartStudySet(user.id, setId);
  return restarted
    ? Response.json({ restarted: true })
    : Response.json({ error: "Набор не найден" }, { status: 404 });
}
