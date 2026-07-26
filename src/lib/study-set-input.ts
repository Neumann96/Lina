export const MAX_CARDS_PER_SET = 500;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StudySetInputCard = {
  id: string | null;
  term: string;
  definition: string;
};

export type StudySetInput = {
  title: string;
  cards: StudySetInputCard[];
};

type StudySetInputResult =
  | { ok: true; value: StudySetInput }
  | { ok: false; error: string };

export function parseStudySetInput(
  body: unknown,
  { allowCardIds = false }: { allowCardIds?: boolean } = {},
): StudySetInputResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Некорректный запрос" };
  }

  const values = body as Record<string, unknown>;
  const title = typeof values.title === "string" ? values.title.trim() : "";
  if (!title || title.length > 120) {
    return { ok: false, error: "Название должно содержать от 1 до 120 символов" };
  }
  if (!Array.isArray(values.cards) || values.cards.length === 0 || values.cards.length > MAX_CARDS_PER_SET) {
    return { ok: false, error: `Добавьте от 1 до ${MAX_CARDS_PER_SET} карточек` };
  }

  const seenIds = new Set<string>();
  const cards: StudySetInputCard[] = [];
  for (const item of values.cards) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Заполните обе стороны каждой карточки" };
    }

    const card = item as Record<string, unknown>;
    const term = typeof card.term === "string" ? card.term.trim() : "";
    const definition = typeof card.definition === "string" ? card.definition.trim() : "";
    if (!term || term.length > 500 || !definition || definition.length > 1000) {
      return { ok: false, error: "Заполните обе стороны каждой карточки" };
    }

    let id: string | null = null;
    if (allowCardIds && card.id !== undefined && card.id !== null) {
      if (typeof card.id !== "string" || !UUID_PATTERN.test(card.id) || seenIds.has(card.id)) {
        return { ok: false, error: "Некорректный список карточек" };
      }
      id = card.id;
      seenIds.add(card.id);
    }

    cards.push({ id, term, definition });
  }

  return { ok: true, value: { title, cards } };
}
