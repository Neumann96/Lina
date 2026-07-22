import { getCurrentUser } from "@/lib/auth";
import { createStudyFolder } from "@/lib/folders";
import { consumeRateLimit } from "@/lib/rate-limit";
import { rateLimitResponse, validateAuthRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Войдите, чтобы создать папку" }, { status: 401 });

  const userLimit = await consumeRateLimit(user.id, {
    scope: "folders-user",
    limit: 60,
    windowSeconds: 60 * 60,
  });
  if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfter);

  let name = "";
  try {
    const body = await request.json() as { name?: unknown };
    name = typeof body.name === "string" ? body.name.trim() : "";
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  if (!name || name.length > 120) {
    return Response.json({ error: "Название должно содержать от 1 до 120 символов" }, { status: 400 });
  }

  const folder = await createStudyFolder(user.id, name);
  return folder
    ? Response.json({ folder }, { status: 201 })
    : Response.json({ error: "Такая папка уже существует или достигнут лимит папок" }, { status: 409 });
}
