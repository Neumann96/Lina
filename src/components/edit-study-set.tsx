"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudySet } from "@/lib/learning";
import { AutoGrowingTextarea } from "@/components/auto-growing-textarea";

type DraftCard = {
  key: string;
  id: string | null;
  term: string;
  definition: string;
};

function EditIcon({ name, size = 21 }: { name: "back" | "cards" | "plus"; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    back: <path d="m15 18-6-6 6-6"/>,
    cards: <><rect x="4" y="5" width="15" height="14" rx="3"/><path d="M8 9h7M8 13h4M7 5V3h13a2 2 0 0 1 2 2v11h-3"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

export function EditStudySet({ studySet }: { studySet: StudySet }) {
  const router = useRouter();
  const nextKey = useRef(1);
  const [title, setTitle] = useState(studySet.title);
  const [cards, setCards] = useState<DraftCard[]>(() => studySet.cards.length
    ? studySet.cards.map((card) => ({ key: card.id, id: card.id, term: card.term, definition: card.definition }))
    : [{ key: "new-0", id: null, term: "", definition: "" }]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const completeCount = useMemo(
    () => cards.filter((card) => card.term.trim() && card.definition.trim()).length,
    [cards],
  );

  function updateCard(key: string, field: "term" | "definition", value: string) {
    setCards((current) => current.map((card) => card.key === key ? { ...card, [field]: value } : card));
    if (error) setError("");
  }

  function addCard() {
    const key = `new-${nextKey.current++}`;
    setCards((current) => [...current, { key, id: null, term: "", definition: "" }]);
  }

  function removeCard(key: string) {
    setCards((current) => current.length === 1
      ? current.map((card) => card.key === key ? { ...card, term: "", definition: "" } : card)
      : current.filter((card) => card.key !== key));
    if (error) setError("");
  }

  async function saveSet() {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError("Добавьте название набора");
      return;
    }

    const hasHalfFilledCard = cards.some((card) => Boolean(card.term.trim()) !== Boolean(card.definition.trim()));
    const completeCards = cards
      .filter((card) => card.term.trim() && card.definition.trim())
      .map((card) => ({
        ...(card.id ? { id: card.id } : {}),
        term: card.term.trim(),
        definition: card.definition.trim(),
      }));
    if (hasHalfFilledCard) {
      setError("Заполните обе стороны каждой начатой карточки");
      return;
    }
    if (!completeCards.length) {
      setError("Оставьте хотя бы одну заполненную карточку");
      return;
    }

    setError("");
    setPending(true);
    try {
      const response = await fetch(`/api/sets/${studySet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: normalizedTitle, cards: completeCards }),
      });
      const result = await response.json() as { updated?: boolean; error?: string };
      if (!response.ok || !result.updated) {
        setError(result.error ?? "Не удалось сохранить изменения");
        return;
      }
      router.push(`/app/study/${studySet.id}`, { transitionTypes: ["nav-forward"] });
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="edit-set-page">
      <header className="edit-set-topbar">
        <Link href="/app/library" transitionTypes={["nav-back"]} aria-label="Вернуться в библиотеку"><EditIcon name="back"/></Link>
        <div><span className="folder-library-brand">L</span><strong>Lina</strong></div>
        <button type="button" onClick={saveSet} disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button>
      </header>

      <main className="edit-set-shell">
        <div className="edit-set-heading">
          <span>Редактор набора</span>
          <h1>Редактировать карточки</h1>
          <p>Исправляйте термины и определения, удаляйте ненужное или добавляйте новые карточки.</p>
        </div>

        <label className="manual-title-field edit-set-title">
          <input value={title} onChange={(event) => { setTitle(event.target.value); if (error) setError(""); }} placeholder="Название набора" maxLength={120} autoFocus />
          <span>НАЗВАНИЕ</span>
        </label>

        <div className="edit-set-summary">
          <span className="edit-set-summary-icon"><EditIcon name="cards"/></span>
          <span><strong>{completeCount} карточек</strong><small>Изменения применятся ко всему набору</small></span>
        </div>

        <div className="manual-card-list">
          {cards.map((card, index) => (
            <article className="manual-card" key={card.key}>
              <header>
                <strong>{index + 1}</strong>
                <button type="button" onClick={() => removeCard(card.key)} aria-label={`Удалить карточку ${index + 1}`} disabled={pending}><span aria-hidden>×</span></button>
              </header>
              <div>
                <label>
                  <AutoGrowingTextarea value={card.term} onChange={(event) => updateCard(card.key, "term", event.target.value)} maxLength={500} aria-label={`Термин ${index + 1}`}/>
                  <span>ТЕРМИН</span>
                </label>
                <label>
                  <AutoGrowingTextarea value={card.definition} onChange={(event) => updateCard(card.key, "definition", event.target.value)} maxLength={1000} aria-label={`Определение ${index + 1}`}/>
                  <span>ОПРЕДЕЛЕНИЕ</span>
                </label>
              </div>
            </article>
          ))}
        </div>

        <button className="manual-add-card edit-set-add" type="button" onClick={addCard} disabled={pending || cards.length >= 500}><EditIcon name="plus" size={19}/> Добавить карточку</button>
        {error && <p className="manual-error" role="alert">{error}</p>}
        <div className="edit-set-footer">
          <Link href="/app/library" transitionTypes={["nav-back"]}>Отмена</Link>
          <button type="button" onClick={saveSet} disabled={pending}>{pending ? "Сохраняем изменения…" : "Сохранить изменения"}</button>
        </div>
      </main>
    </div>
  );
}
