"use client";

import { useMemo, useState } from "react";
import { parseBulkTerms, type TermPair } from "@/lib/parse-bulk-terms";

const example = "serendipity — счастливая случайность\nresilient\tстойкий, устойчивый\ninsight: понимание сути";

export function BulkCardEditor() {
  const [raw, setRaw] = useState(example);
  const [pairs, setPairs] = useState<TermPair[]>(() => parseBulkTerms(example));
  const complete = useMemo(() => pairs.filter((pair) => pair.term && pair.definition).length, [pairs]);

  function recognize() { setPairs(parseBulkTerms(raw)); }
  function update(id: string, key: "term" | "definition", value: string) {
    setPairs((current) => current.map((pair) => pair.id === id ? { ...pair, [key]: value } : pair));
  }

  return (
    <div className="editor-card">
      <div className="paste-panel">
        <div className="panel-title"><span className="step">1</span><div><strong>Вставь список</strong><small>Каждая пара — с новой строки</small></div></div>
        <textarea value={raw} onChange={(event) => setRaw(event.target.value)} aria-label="Список слов" spellCheck={false} />
        <div className="separator-hint"><span>Распознаём</span><kbd>Tab</kbd><kbd>—</kbd><kbd>:</kbd><kbd>;</kbd><kbd>,</kbd></div>
        <button className="recognize-button" onClick={recognize}>Распознать слова <span>→</span></button>
      </div>
      <div className="preview-panel">
        <div className="panel-title"><span className="step light">2</span><div><strong>Проверь результат</strong><small>{complete} из {pairs.length} пар готовы</small></div></div>
        <div className="pairs-list">
          {pairs.length === 0 ? <div className="empty-state">Здесь появятся карточки</div> : pairs.map((pair, index) => (
            <div className="pair-row" key={pair.id}>
              <span className="pair-number">{String(index + 1).padStart(2, "0")}</span>
              <input value={pair.term} onChange={(e) => update(pair.id, "term", e.target.value)} aria-label={`Слово ${index + 1}`} />
              <span className="pair-arrow">→</span>
              <input className={!pair.definition ? "missing" : ""} value={pair.definition} onChange={(e) => update(pair.id, "definition", e.target.value)} placeholder="Добавить перевод" aria-label={`Перевод ${index + 1}`} />
            </div>
          ))}
        </div>
        <div className="preview-footer"><span><i /> Автосохранение включено</span><button disabled={complete === 0}>Создать {complete} карточки</button></div>
      </div>
    </div>
  );
}
