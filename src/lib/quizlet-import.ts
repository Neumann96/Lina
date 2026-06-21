export type ImportedQuizletSet = {
  title: string;
  cards: Array<{ term: string; definition: string }>;
};

const MAX_CARDS = 500;

export function normalizeQuizletUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (host !== "quizlet.com" && !host.endsWith(".quizlet.com"))) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  for (const key of ["text", "value", "word", "definition"]) {
    if (typeof record[key] === "string") return record[key].trim();
  }
  return "";
}

function cardFrom(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const term = textValue(record.word ?? record.term ?? record.front ?? record.question);
  const definition = textValue(record.definition ?? record.back ?? record.answer);
  return term && definition ? { term, definition } : null;
}

function findCardCollections(value: unknown, found: Array<Array<{ term: string; definition: string }>>, depth = 0) {
  if (depth > 12 || found.length > 30 || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    const cards = value.map(cardFrom).filter((card): card is { term: string; definition: string } => Boolean(card));
    if (cards.length >= 2 && cards.length >= Math.ceil(value.length * 0.6)) found.push(cards.slice(0, MAX_CARDS));
    for (const item of value) findCardCollections(item, found, depth + 1);
    return;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    findCardCollections(child, found, depth + 1);
  }
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function regexCards(html: string) {
  const cards: Array<{ term: string; definition: string }> = [];
  const patterns = [
    /"word"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,1800}?"definition"\s*:\s*"((?:\\.|[^"\\])*)"/g,
    /"term"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,1800}?"definition"\s*:\s*"((?:\\.|[^"\\])*)"/g,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const term = decodeJsonString(match[1]).trim();
      const definition = decodeJsonString(match[2]).trim();
      if (term && definition && !cards.some((card) => card.term === term && card.definition === definition)) {
        cards.push({ term, definition });
      }
      if (cards.length >= MAX_CARDS) return cards;
    }
    if (cards.length >= 2) break;
  }
  return cards;
}

function pageTitle(html: string) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    ?? "Набор из Quizlet";
  return ogTitle
    .replace(/&amp;/g, "&")
    .replace(/\s*[|—-]\s*Quizlet.*$/i, "")
    .trim()
    .slice(0, 120) || "Набор из Quizlet";
}

export function parseQuizletHtml(html: string): ImportedQuizletSet | null {
  const collections: Array<Array<{ term: string; definition: string }>> = [];
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const content = match[1].trim();
    if (!content || (content[0] !== "{" && content[0] !== "[")) continue;
    try {
      findCardCollections(JSON.parse(content), collections);
    } catch {
      // Most page scripts are JavaScript rather than standalone JSON.
    }
  }
  const cards = collections.sort((a, b) => b.length - a.length)[0] ?? regexCards(html);
  return cards.length ? { title: pageTitle(html), cards } : null;
}
