import { getCurrentUser } from "@/lib/auth";
import { createStudySet } from "@/lib/learning";
import { validateAuthRequest } from "@/lib/request-security";

const MAX_CARDS = 500;

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Войдите, чтобы создать набор" }, { status: 401 });

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
  const title = typeof values.title === "string" ? values.title.trim() : "";
  if (!title || title.length > 120) {
    return Response.json({ error: "Название должно содержать от 1 до 120 символов" }, { status: 400 });
  }
  if (!Array.isArray(values.cards) || values.cards.length === 0 || values.cards.length > MAX_CARDS) {
    return Response.json({ error: `Добавьте от 1 до ${MAX_CARDS} карточек` }, { status: 400 });
  }

  const cards = values.cards.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const card = item as Record<string, unknown>;
    const term = typeof card.term === "string" ? card.term.trim() : "";
    const definition = typeof card.definition === "string" ? card.definition.trim() : "";
    return term && term.length <= 500 && definition && definition.length <= 1000 ? { term, definition } : null;
  });

  if (cards.some((card) => !card)) {
    return Response.json({ error: "Заполните обе стороны каждой карточки" }, { status: 400 });
  }

  const setId = await createStudySet(user.id, title, cards as Array<{ term: string; definition: string }>);
  return Response.json({ id: setId }, { status: 201 });
}
