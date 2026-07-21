"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StudyCard, StudySet } from "@/lib/learning";
import type { ReviewKind, ReviewRating } from "@/lib/spaced-repetition";

type SessionCard = {
  card: StudyCard;
  kind: ReviewKind;
  retryCount: number;
};

function StudyIcon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    close: <path d="m6 6 12 12M18 6 6 18" />,
    restart: <><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></>,
    star: <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

export function StudySession({ studySet }: { studySet: StudySet }) {
  const router = useRouter();
  const initialCards = studySet.cards.slice(studySet.startIndex);
  const [queue, setQueue] = useState<SessionCard[]>(() => initialCards.map((card) => ({
    card,
    kind: "scheduled",
    retryCount: 0,
  })));
  const [scheduledAnswered, setScheduledAnswered] = useState(0);
  const [ratings, setRatings] = useState<Record<ReviewRating, number>>({ A: 0, B: 0, C: 0 });
  const [answerText, setAnswerText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [exitDirection, setExitDirection] = useState<"left" | "middle" | "right" | null>(null);
  const [restarting, setRestarting] = useState(false);
  const cardStartedAt = useRef(0);
  const responseTime = useRef<number | null>(null);
  const pendingReviews = useRef(new Set<Promise<void>>());
  const exiting = useRef(false);
  const current = queue[0];
  const nextCard = queue[1]?.card;
  const card = current?.card;
  const finished = queue.length === 0;
  const isReviewSession = studySet.mode === "reviews";
  const initialTotal = initialCards.length;
  const progress = initialTotal ? Math.min(100, scheduledAnswered / initialTotal * 100) : 100;

  useEffect(() => {
    cardStartedAt.current = performance.now();
    responseTime.current = null;
  }, [card?.id, current?.retryCount]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!revealed || isSaving) return;
      const rating = event.key.toUpperCase();
      if (rating === "A" || rating === "B" || rating === "C") {
        event.preventDefault();
        void submitRating(rating);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function revealAnswer(event?: FormEvent) {
    event?.preventDefault();
    if (!card || revealed) return;
    responseTime.current = Math.min(300_000, Math.max(0, Math.round(performance.now() - cardStartedAt.current)));
    setSaveError("");
    setRevealed(true);
  }

  function saveReview(cardId: string, rating: ReviewRating, kind: ReviewKind) {
    const request = fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, rating, responseMs: responseTime.current, kind }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error("Не удалось сохранить ответ");
    });
    pendingReviews.current.add(request);
    void request.then(
      () => pendingReviews.current.delete(request),
      () => pendingReviews.current.delete(request),
    );
    return request;
  }

  async function submitRating(rating: ReviewRating) {
    if (!current || !revealed || isSaving || exitDirection) return;
    setIsSaving(true);
    setSaveError("");
    try {
      await saveReview(current.card.id, rating, current.kind);
    } catch {
      setSaveError("Ответ не сохранился. Проверьте интернет и попробуйте ещё раз.");
      setIsSaving(false);
      return;
    }

    setRatings((value) => ({ ...value, [rating]: value[rating] + 1 }));
    if (current.kind === "scheduled") setScheduledAnswered((value) => value + 1);
    setExitDirection(rating === "A" ? "right" : rating === "B" ? "middle" : "left");

    window.setTimeout(() => {
      setQueue((value) => {
        const [answered, ...remaining] = value;
        if (rating !== "C" || !answered || answered.retryCount >= 2) return remaining;
        return [...remaining, {
          card: answered.card,
          kind: "same_session",
          retryCount: answered.retryCount + 1,
        }];
      });
      setAnswerText("");
      setRevealed(false);
      setFavorite(false);
      setExitDirection(null);
      setIsSaving(false);
    }, 260);
  }

  async function closeSession(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (exiting.current) return;
    exiting.current = true;
    await Promise.allSettled([...pendingReviews.current]);
    router.push(`/?studyExit=${Date.now()}`, { transitionTypes: ["nav-back"] });
  }

  async function restartSession() {
    if (isReviewSession || restarting || !window.confirm("Начать этот набор заново? Текущий прогресс будет сброшен.")) return;
    setRestarting(true);
    await Promise.allSettled([...pendingReviews.current]);
    try {
      const response = await fetch(`/api/sets/${studySet.id}/restart`, { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.reload();
    } catch {
      window.alert("Не удалось начать набор заново. Попробуйте ещё раз.");
      setRestarting(false);
    }
  }

  function speak(text: string | undefined) {
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  const position = initialTotal
    ? Math.min(initialTotal, scheduledAnswered + (finished ? 0 : 1))
    : 0;

  return (
    <main className="study-page">
      <header className="study-header">
        <Link className="study-round-button" href="/" transitionTypes={["nav-back"]} onClick={closeSession} aria-label="Закрыть режим обучения"><StudyIcon name="close" size={27}/></Link>
        <div className="study-heading">
          <strong>{studySet.title}</strong>
          <span>{position} / {initialTotal}</span>
          {current?.kind === "same_session" && <small>закрепляем ошибку</small>}
        </div>
        {isReviewSession ? (
          <Link className="study-round-button" href="/" transitionTypes={["nav-back"]} onClick={closeSession} aria-label="На главную"><StudyIcon name="close" size={25}/></Link>
        ) : (
          <button className="study-round-button" type="button" onClick={restartSession} disabled={restarting} aria-label="Начать набор заново"><StudyIcon name="restart" size={25}/></button>
        )}
      </header>
      <div className="study-progress" aria-label={`Пройдено ${scheduledAnswered} из ${initialTotal}`}><span style={{ width: `${progress}%` }}/></div>

      <section className="study-stage">
        <div className="study-counters" aria-hidden>
          <span className="study-counter learning"><strong>{ratings.C}</strong></span>
          <span className="study-counter known"><strong>{ratings.A}</strong></span>
        </div>

        {finished ? (
          <div className="study-complete">
            <span>✨</span><h1>Готово!</h1>
            <p>{ratings.C ? "Сложные карточки уже вернулись в этой сессии и снова придут завтра." : "Все карточки распределены по следующему повторению."}</p>
            <div className="study-result-grid">
              <b className="result-c">{ratings.C}<small>не вспомнил</small></b>
              <b className="result-b">{ratings.B}<small>с трудом</small></b>
              <b className="result-a">{ratings.A}<small>уверенно</small></b>
            </div>
            <Link href="/" transitionTypes={["nav-back"]} onClick={closeSession}>Вернуться на главную</Link>
          </div>
        ) : card && current ? (
          <div className="study-card-wrap">
            {nextCard && <div className="study-card-next" aria-hidden><strong>{nextCard.term}</strong></div>}
            <article
              key={`${card.id}-${current.retryCount}`}
              className={`study-card recall-card${revealed ? " revealed" : ""}${exitDirection ? ` exits-${exitDirection}` : ""}`}
            >
              <button className="study-card-action sound" type="button" onClick={() => speak(revealed ? card.definition : card.term)} aria-label="Произнести вслух"><StudyIcon name="volume"/></button>
              <button className={`study-card-action favorite${favorite ? " active" : ""}`} type="button" onClick={() => setFavorite((value) => !value)} aria-label="Добавить в избранное"><StudyIcon name="star"/></button>

              <div className="recall-card-content">
                <span className="recall-kicker">{current.kind === "same_session" ? "Попробуйте ещё раз" : "Вспомните без подсказки"}</span>
                <strong className="recall-term">{card.term}</strong>

                {!revealed ? (
                  <form className="recall-form" onSubmit={revealAnswer}>
                    <label htmlFor={`recall-${card.id}`}>Ваш ответ</label>
                    <textarea
                      id={`recall-${card.id}`}
                      value={answerText}
                      onChange={(event) => setAnswerText(event.target.value)}
                      placeholder="Введите перевод или объяснение своими словами"
                      autoComplete="off"
                      spellCheck={false}
                      rows={2}
                      autoFocus
                    />
                    <div>
                      <button className="recall-forgot" type="button" onClick={() => revealAnswer()}>Не помню</button>
                      <button className="recall-check" type="submit" disabled={!answerText.trim()}>Проверить ответ</button>
                    </div>
                    <small>Попытка вспомнить укрепляет память сильнее, чем простое перечитывание.</small>
                  </form>
                ) : (
                  <div className="recall-feedback">
                    <div className="answer-comparison">
                      <div><span>Ваш ответ</span><p>{answerText.trim() || "Не вспомнил"}</p></div>
                      <div><span>Ответ карточки</span><p>{card.definition}</p></div>
                    </div>
                    <p className="rating-prompt">Как прошла попытка?</p>
                    <div className="recall-ratings" aria-label="Оцените воспроизведение">
                      <button className="rating-c" type="button" onClick={() => void submitRating("C")} disabled={isSaving}><kbd>C</kbd><strong>Не вспомнил</strong><small>ещё раз + завтра</small></button>
                      <button className="rating-b" type="button" onClick={() => void submitRating("B")} disabled={isSaving}><kbd>B</kbd><strong>С трудом</strong><small>завтра</small></button>
                      <button className="rating-a" type="button" onClick={() => void submitRating("A")} disabled={isSaving}><kbd>A</kbd><strong>Уверенно</strong><small>через 3+ дня</small></button>
                    </div>
                    {saveError && <p className="recall-save-error" role="alert">{saveError}</p>}
                  </div>
                )}
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
