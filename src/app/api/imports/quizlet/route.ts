import { getCurrentUser } from "@/lib/auth";
import { normalizeQuizletUrl, parseQuizletHtml } from "@/lib/quizlet-import";
import { validateAuthRequest } from "@/lib/request-security";

const MAX_HTML_BYTES = 5 * 1024 * 1024;

async function readLimited(response: Response) {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_HTML_BYTES) throw new Error("too-large");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("too-large");
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

async function fetchQuizletPage(initialUrl: URL) {
  let url = initialUrl;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; LinaImporter/1.0)",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? normalizeQuizletUrl(new URL(location, url).toString()) : null;
      if (!next) throw new Error("redirect");
      url = next;
      continue;
    }
    return response;
  }
  throw new Error("redirect");
}

export async function POST(request: Request) {
  const securityError = validateAuthRequest(request);
  if (securityError) return securityError;
  if (!await getCurrentUser()) return Response.json({ error: "Войдите, чтобы импортировать набор" }, { status: 401 });

  let value = "";
  try {
    const body = await request.json() as { url?: unknown };
    value = typeof body.url === "string" ? body.url : "";
  } catch {
    return Response.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const url = normalizeQuizletUrl(value);
  if (!url) return Response.json({ error: "Вставьте ссылку на набор Quizlet" }, { status: 400 });

  try {
    const response = await fetchQuizletPage(url);
    if (!response.ok) {
      return Response.json({ error: "Quizlet не открыл набор. Проверьте, что он доступен всем, или вставьте экспортированный текст." }, { status: 422 });
    }
    const result = parseQuizletHtml(await readLimited(response));
    if (!result) {
      return Response.json({ error: "Не удалось найти карточки на странице. Попробуйте импорт через текст — он работает надёжнее." }, { status: 422 });
    }
    return Response.json(result);
  } catch {
    return Response.json({ error: "Quizlet сейчас не отдаёт этот набор автоматически. Скопируйте его через «Экспорт» и вставьте текст ниже." }, { status: 422 });
  }
}
