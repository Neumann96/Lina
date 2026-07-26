import { getCurrentUser } from "@/lib/auth";
import { createStudySet } from "@/lib/learning";
import { consumeRateLimit } from "@/lib/rate-limit";
import { rateLimitResponse, validateAuthRequest } from "@/lib/request-security";
import { parseStudySetInput } from "@/lib/study-set-input";

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Войдите, чтобы создать набор" }, { status: 401 });

  const userLimit = await consumeRateLimit(user.id, {
    scope: "sets-user",
    limit: 20,
    windowSeconds: 60 * 60,
  });
  if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = parseStudySetInput(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const setId = await createStudySet(user.id, parsed.value.title, parsed.value.cards);
  if (!setId) {
    return Response.json(
      { error: "Достигнут лимит хранилища: удалите ненужные наборы перед созданием нового" },
      { status: 409 },
    );
  }
  return Response.json({ id: setId }, { status: 201 });
}
