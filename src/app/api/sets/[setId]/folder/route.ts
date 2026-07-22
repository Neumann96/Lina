import { getCurrentUser } from "@/lib/auth";
import { moveStudySetToFolder } from "@/lib/folders";
import { consumeRateLimit } from "@/lib/rate-limit";
import { rateLimitResponse, validateAuthRequest } from "@/lib/request-security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ setId: string }> },
) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Войдите, чтобы переместить набор" }, { status: 401 });

  const userLimit = await consumeRateLimit(user.id, {
    scope: "folders-user",
    limit: 60,
    windowSeconds: 60 * 60,
  });
  if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfter);

  const { setId } = await params;
  if (!UUID_PATTERN.test(setId)) {
    return Response.json({ error: "Некорректный набор" }, { status: 400 });
  }

  let folderId: string | null = null;
  try {
    const body = await request.json() as { folderId?: unknown };
    folderId = body.folderId === null ? null : typeof body.folderId === "string" ? body.folderId : "";
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  if (folderId !== null && !UUID_PATTERN.test(folderId)) {
    return Response.json({ error: "Некорректная папка" }, { status: 400 });
  }

  const moved = await moveStudySetToFolder(user.id, setId, folderId);
  return moved
    ? Response.json({ moved: true })
    : Response.json({ error: "Набор или папка не найдены" }, { status: 404 });
}
