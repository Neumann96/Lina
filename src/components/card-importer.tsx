"use client";

import { useMemo, useState } from "react";
import { parseBulkTerms, type TermPair } from "@/lib/parse-bulk-terms";

type ImportMode = "link" | "text";

function makePairs(cards: Array<{ term: string; definition: string }>): TermPair[] {
  const stamp = Date.now();
  return cards.map((card, index) => ({ id: `${stamp}-${index}`, ...card }));
}

export function CardImporter({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<ImportMode>("link");
  const [url, setUrl] = useState("");
  const [raw, setRaw] = useState("");
  const [title, setTitle] = useState("");
  const [pairs, setPairs] = useState<TermPair[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"import" | "save" | null>(null);
  const complete = useMemo(() => pairs.filter((pair) => pair.term.trim() && pair.definition.trim()).length, [pairs]);

  function importText() {
    const parsed = parseBulkTerms(raw);
    setPairs(parsed);
    setError(parsed.length ? "" : "Вставьте хотя бы одну пару слов");
  }

  async function importLink() {
    setError("");
    setPending("import");
    try {
      const response = await fetch("/api/imports/quizlet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json() as { title?: string; cards?: Array<{ term: string; definition: string }>; error?: string };
      if (!response.ok || !result.cards?.length) {
        setError(result.error ?? "Не удалось импортировать набор");
        return;
      }
      setTitle(result.title ?? "Набор из Quizlet");
      setPairs(makePairs(result.cards));
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте импорт через текст.");
    } finally {
      setPending(null);
    }
  }

  function updatePair(id: string, key: "term" | "definition", value: string) {
    setPairs((current) => current.map((pair) => pair.id === id ? { ...pair, [key]: value } : pair));
  }

  async function save() {
    const cards = pairs
      .map(({ term, definition }) => ({ term: term.trim(), definition: definition.trim() }))
      .filter((card) => card.term && card.definition);
    if (!title.trim()) {
      setError("Добавьте название набора");
      return;
    }
    setError("");
    setPending("save");
    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, cards }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Не удалось создать набор");
        return;
      }
      window.location.reload();
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="card-importer">
      <button className="create-back" type="button" onClick={onBack}>
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
        Все способы
      </button>
      <div className="camera-heading import-heading">
        <span>Импорт карточек</span>
        <h2>Перенесите готовый набор</h2>
        <p>Сначала загрузим карточки, затем вы сможете проверить и исправить каждую пару.</p>
      </div>

      <div className="import-tabs" role="tablist" aria-label="Способ импорта">
        <button type="button" role="tab" aria-selected={mode === "link"} className={mode === "link" ? "active" : ""} onClick={() => { setMode("link"); setError(""); }}>Ссылка Quizlet</button>
        <button type="button" role="tab" aria-selected={mode === "text"} className={mode === "text" ? "active" : ""} onClick={() => { setMode("text"); setError(""); }}>Вставить текст</button>
      </div>

      {mode === "link" ? (
        <div className="import-source-panel">
          <label htmlFor="quizlet-url">Ссылка на открытый набор Quizlet</label>
          <input id="quizlet-url" type="url" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://quizlet.com/…" />
          <p>Работает только с публичными наборами. Quizlet иногда блокирует автоматический доступ — тогда используйте вкладку «Вставить текст».</p>
          <button className="import-primary" type="button" onClick={importLink} disabled={!url.trim() || pending !== null}>{pending === "import" ? "Загружаем…" : "Загрузить карточки"}</button>
        </div>
      ) : (
        <div className="import-source-panel">
          <label htmlFor="import-text">По одной паре на строку</label>
          <textarea id="import-text" value={raw} onChange={(event) => setRaw(event.target.value)} placeholder={'hello, привет\ngoodbye до свидания'} spellCheck={false} />
          <p>Между словом и переводом можно поставить запятую, пробел или табуляцию. Для фраз точнее всего использовать запятую или табуляцию из экспорта Quizlet.</p>
          <button className="import-primary" type="button" onClick={importText} disabled={!raw.trim() || pending !== null}>Разделить на карточки</button>
        </div>
      )}

      {error && <p className="import-error" role="alert">{error}</p>}

      {pairs.length > 0 && (
        <div className="import-preview">
          <div className="import-preview-title"><div><span>Проверка</span><h3>{complete} из {pairs.length} карточек готовы</h3></div></div>
          <label htmlFor="import-title">Название набора</label>
          <input id="import-title" className="import-title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Английский — путешествия" maxLength={120} />
          <div className="import-pairs">
            {pairs.map((pair, index) => (
              <div key={pair.id}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <input value={pair.term} onChange={(event) => updatePair(pair.id, "term", event.target.value)} aria-label={`Слово ${index + 1}`} />
                <input className={!pair.definition ? "missing" : ""} value={pair.definition} onChange={(event) => updatePair(pair.id, "definition", event.target.value)} placeholder="Перевод" aria-label={`Перевод ${index + 1}`} />
              </div>
            ))}
          </div>
          <button className="import-save" type="button" onClick={save} disabled={!complete || pending !== null}>{pending === "save" ? "Создаём…" : `Создать набор · ${complete}`}</button>
        </div>
      )}
    </div>
  );
}
