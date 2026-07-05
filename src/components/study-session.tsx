"use client";

import { MouseEvent, PointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StudySet } from "@/lib/learning";

const SWIPE_THRESHOLD = 82;

function StudyIcon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    close: <path d="m6 6 12 12M18 6 6 18" />,
    restart: <><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/></>,
    star: <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z"/>,
    left: <><path d="m14.5 6-6 6 6 6"/><path d="M9 12h10"/></>,
    right: <><path d="m9.5 6 6 6-6 6"/><path d="M15 12H5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

export function StudySession({ studySet }: { studySet: StudySet }) {
  const router = useRouter();
  const [index, setIndex] = useState(studySet.startIndex);
  const [known, setKnown] = useState(0);
  const [learning, setLearning] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<-1 | 0 | 1>(0);
  const [restarting, setRestarting] = useState(false);
  const startX = useRef(0);
  const moved = useRef(false);
  const pendingReviews = useRef(new Set<Promise<void>>());
  const exiting = useRef(false);
  const isReviewSession = studySet.mode === "reviews";
  const card = studySet.cards[index];
  const nextCard = studySet.cards[index + 1];
  const finished = index >= studySet.cards.length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") answer(false);
      if (event.key === "ArrowRight") answer(true);
      if (event.key === " " && card) {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function saveReview(cardId: string, correct: boolean) {
    const request = fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, isCorrect: correct }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error("Не удалось сохранить прогресс");
    });
    pendingReviews.current.add(request);
    void request.then(
      () => pendingReviews.current.delete(request),
      () => pendingReviews.current.delete(request),
    );
  }

  async function closeSession(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (exiting.current) return;
    exiting.current = true;
    await Promise.allSettled([...pendingReviews.current]);
    router.push(`/?studyExit=${Date.now()}`, { transitionTypes: ["nav-back"] });
  }

  async function restartSession() {
    if (isReviewSession) return;
    if (restarting || !window.confirm("Начать этот набор заново? Текущий прогресс будет сброшен.")) return;
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

  function answer(correct: boolean) {
    if (!card || exitDirection) return;
    const direction = correct ? 1 : -1;
    setExitDirection(direction);
    setDragX(direction * Math.max(window.innerWidth, 540));
    saveReview(card.id, correct);
    window.setTimeout(() => {
      if (correct) setKnown((value) => value + 1);
      else setLearning((value) => value + 1);
      setIndex((value) => value + 1);
      setFlipped(false);
      setFavorite(false);
      setDragX(0);
      setExitDirection(0);
    }, 320);
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (finished) return;
    startX.current = event.clientX;
    moved.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!isDragging) return;
    const offset = event.clientX - startX.current;
    if (Math.abs(offset) > 7) moved.current = true;
    setDragX(offset);
  }

  function onPointerUp() {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragX) >= SWIPE_THRESHOLD) answer(dragX > 0);
    else {
      setDragX(0);
      if (!moved.current) setFlipped((value) => !value);
    }
  }

  function speak() {
    if (!card || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(flipped ? card.definition : card.term));
  }

  return (
    <main className="study-page">
      <header className="study-header">
        <Link className="study-round-button" href="/" transitionTypes={["nav-back"]} onClick={closeSession} aria-label="Закрыть режим обучения"><StudyIcon name="close" size={27}/></Link>
        <div className="study-heading"><strong>{studySet.title}</strong><span>{studySet.cards.length ? Math.min(index + 1, studySet.cards.length) : 0} / {studySet.cards.length}</span></div>
        {isReviewSession ? (
          <Link className="study-round-button" href="/" transitionTypes={["nav-back"]} onClick={closeSession} aria-label="На главную"><StudyIcon name="close" size={25}/></Link>
        ) : (
          <button className="study-round-button" type="button" onClick={restartSession} disabled={restarting} aria-label="Начать набор заново"><StudyIcon name="restart" size={25}/></button>
        )}
      </header>
      <div className="study-progress" aria-label={`Пройдено ${index} из ${studySet.cards.length}`}><span style={{ width: `${studySet.cards.length ? index / studySet.cards.length * 100 : 0}%` }}/></div>

      <section className="study-stage">
        <div className="study-counters">
          <span className="study-counter learning" aria-label={`Ещё учу: ${learning}`}><strong>{learning}</strong></span>
          <span className="study-counter known" aria-label={`Знаю: ${known}`}><strong>{known}</strong></span>
        </div>

        {finished ? (
          <div className="study-complete">
            <span>✨</span><h1>Готово!</h1><p>{isReviewSession ? "На сейчас нет слов, которые нужно повторить." : "Вы повторили весь набор."}</p>
            <div><b>{learning}<small>ещё учу</small></b><b>{known}<small>знаю</small></b></div>
            <Link href="/" transitionTypes={["nav-back"]} onClick={closeSession}>Вернуться на главную</Link>
          </div>
        ) : (
          <div className="study-card-wrap">
            {nextCard && <div className="study-card-next" aria-hidden><strong>{nextCard.term}</strong></div>}
            <button
              key={card.id}
              className={`study-card${flipped ? " flipped" : ""}${isDragging ? " dragging" : ""}`}
              type="button"
              aria-label={flipped ? `Значение: ${card.definition}` : `Слово: ${card.term}. Нажмите, чтобы увидеть значение`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{ transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`, opacity: exitDirection ? 0 : 1 }}
            >
              <span className={`study-swipe-label left${isDragging && dragX < -8 ? " visible" : ""}`}>ЕЩЁ УЧУ</span>
              <span className={`study-swipe-label right${isDragging && dragX > 8 ? " visible" : ""}`}>ЗНАЮ</span>
              <span className="study-card-inner">
                <span className="study-card-face front"><strong>{card.term}</strong><small>Нажмите, чтобы перевернуть</small></span>
                <span className="study-card-face back"><strong>{card.definition}</strong><small>Нажмите, чтобы вернуть слово</small></span>
              </span>
            </button>
            <button className="study-card-action sound" type="button" onClick={speak} aria-label="Произнести вслух"><StudyIcon name="volume"/></button>
            <button className={`study-card-action favorite${favorite ? " active" : ""}`} type="button" onClick={() => setFavorite((value) => !value)} aria-label="Добавить в избранное"><StudyIcon name="star"/></button>
            <div className="study-desktop-actions" aria-label="Ответить на карточку">
              <button className="learning" type="button" onClick={() => answer(false)} disabled={Boolean(exitDirection)} aria-label="Ещё учу — отправить карточку влево"><StudyIcon name="left" size={29}/></button>
              <button className="known" type="button" onClick={() => answer(true)} disabled={Boolean(exitDirection)} aria-label="Знаю — отправить карточку вправо"><StudyIcon name="right" size={29}/></button>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}
