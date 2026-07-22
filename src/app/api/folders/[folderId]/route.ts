import { getCurrentUser } from "@/lib/auth";
import { deleteStudyFolder, renameStudyFolder } from "@/lib/folders";
import { consumeRateLimit } from "@/lib/rate-limit";
import { rateLimitResponse, validateAuthRequest } from "@/lib/request-security";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorize(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return { response: securityError };

  const user = await getCurrentUser();
  if (!user) return { response: Response.json({ error: "Войдите, чтобы изменить папку" }, { status: 401 }) };

  const userLimit = await consumeRateLimit(user.id, {
    scope: "folders-user",
    limit: 60,
    windowSeconds: 60 * 60,
  });
  if (!userLimit.allowed) return { response: rateLimitResponse(userLimit.retryAfter) };
  return { user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const authorization = await authorize(request);
  if ("response" in authorization) return authorization.response;

  const { folderId } = await params;
  if (!UUID_PATTERN.test(folderId)) {
    return Response.json({ error: "Некорректная папка" }, { status: 400 });
  }

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

  const folder = await renameStudyFolder(authorization.user.id, folderId, name);
  return folder
    ? Response.json({ folder })
    : Response.json({ error: "Папка не найдена или такое название уже занято" }, { status: 409 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const authorization = await authorize(request);
  if ("response" in authorization) return authorization.response;

  const { folderId } = await params;
  if (!UUID_PATTERN.test(folderId)) {
    return Response.json({ error: "Некорректная папка" }, { status: 400 });
  }

  const deleted = await deleteStudyFolder(authorization.user.id, folderId);
  return deleted
    ? Response.json({ deleted: true })
    : Response.json({ error: "Папка не найдена" }, { status: 404 });
}
