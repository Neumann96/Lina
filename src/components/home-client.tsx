"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreateMethodPicker } from "@/components/create-method-picker";
import type { AuthUser } from "@/lib/auth";
import type { DashboardData } from "@/lib/learning";
import { parseTelegramAuthResult } from "@/lib/telegram-auth-result";

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    cards: <><rect x="4" y="5" width="15" height="14" rx="3"/><path d="M8 9h7M8 13h4"/><path d="M7 5V3h13a2 2 0 0 1 2 2v11h-3"/></>,
    chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    collapse: <><path d="m15 18-6-6 6-6"/><path d="M20 5v14"/></>,
    expand: <><path d="m9 18 6-6-6-6"/><path d="M4 5v14"/></>,
    logout: <><path d="M10 5V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5v-2"/><path d="m15 8 4 4-4 4M19 12H9"/></>,
    spark: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/></>,
    camera: <><path d="M8 6 9.5 4h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3Z"/><circle cx="12" cy="13" r="4"/></>,
    file: <><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    brain: <><path d="M9.5 4.5A3 3 0 0 0 4 6v1.2A3.5 3.5 0 0 0 3 13a3.5 3.5 0 0 0 3.5 5.5H10V4.8"/><path d="M14.5 4.5A3 3 0 0 1 20 6v1.2a3.5 3.5 0 0 1 1 5.8 3.5 3.5 0 0 1-3.5 5.5H14V4.8M7 9h3M14 9h3M7 15h3M14 15h3"/></>,
    telegram: <><path d="m21 4-3 16-6-5-3 3 1-5 8-6-10 5-5-2 18-6Z"/><path d="m10 13 8-6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

type AuthMode = "register" | "login";
type AppTab = "home" | "create" | "library";

type AuthModalProps = {
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: (user: AuthUser) => void;
};

function TelegramLoginWidget({
  onError,
  onSuccess,
}: {
  onError: (message: string) => void;
  onSuccess: (user: AuthUser) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [miniAppPending, setMiniAppPending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const container = containerRef.current;

    // Telegram Mini Apps already provide signed user data. In that context we
    // render an explicit button below instead of starting the browser widget.
    if (window.Telegram?.WebApp?.initData) return;

    void (async () => {
      try {
        const response = await fetch("/api/auth/telegram", {
          cache: "no-store",
          signal: controller.signal,
        });
        const setup = await response.json() as { botUsername?: string; error?: string };
        if (!response.ok || !setup.botUsername) {
          throw new Error(setup.error ?? "Вход через Telegram пока недоступен");
        }
        if (!container || controller.signal.aborted) return;

        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?23";
        script.async = true;
        script.setAttribute("data-telegram-login", setup.botUsername);
        script.setAttribute("data-size", "large");
        script.setAttribute("data-radius", "11");
        script.setAttribute("data-userpic", "false");
        script.setAttribute("data-lang", "ru");
        script.setAttribute("data-auth-url", `${window.location.origin}/api/auth/telegram/callback`);
        script.onerror = () => onError("Не удалось загрузить Telegram. Обновите страницу и попробуйте ещё раз");
        container.replaceChildren(script);
      } catch (error) {
        if (controller.signal.aborted) return;
        onError(error instanceof Error ? error.message : "Вход через Telegram пока недоступен");
      }
    })();

    return () => {
      controller.abort();
      container?.replaceChildren();
    };
  }, [onError]);

  async function loginWithMiniApp() {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      onError("Telegram не передал данные для входа");
      return;
    }

    setMiniAppPending(true);
    onError("");
    try {
      const response = await fetch("/api/auth/telegram/mini-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });
      const result = await response.json() as { user?: AuthUser; error?: string };
      if (!response.ok || !result.user) {
        onError(result.error ?? "Не удалось войти через Telegram");
        return;
      }
      onSuccess(result.user);
    } catch {
      onError("Не удалось связаться с сервером. Попробуйте ещё раз");
    } finally {
      setMiniAppPending(false);
    }
  }

  return <>
    <div ref={containerRef} className="telegram-login-widget"><span>Загружаем Telegram…</span></div>
    <button className="telegram-login telegram-mini-app-login" type="button" onClick={loginWithMiniApp} disabled={miniAppPending}>
      {miniAppPending ? "Входим через Telegram…" : "Войти через Telegram"}
    </button>
  </>;
}

function AuthModal({ mode, onClose, onModeChange, onSuccess }: AuthModalProps) {
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState("");
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const isRegister = mode === "register";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    emailRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setErrorField("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (isRegister && password !== confirmation) {
      setError("Пароли не совпадают");
      setErrorField("confirmation");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmation }),
      });
      const result = await response.json() as { user?: AuthUser; error?: string; field?: string };
      if (!response.ok || !result.user) {
        setError(result.error ?? "Что-то пошло не так. Попробуйте ещё раз");
        setErrorField(result.field ?? "");
        return;
      }
      onSuccess(result.user);
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз");
    } finally {
      setPending(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setError("");
    setErrorField("");
    onModeChange(nextMode);
  }

  return (
    <div className="auth-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="modal-brand"><span className="brand-mark">L</span><span>Lina</span></div>
        <h2 id="auth-title">{isRegister ? "Создайте аккаунт" : "С возвращением"}</h2>
        <p>{isRegister ? "Сохраняйте наборы и продолжайте с любого устройства" : "Войдите, чтобы продолжить обучение"}</p>
        <form className="auth-form" onSubmit={submit} noValidate>
          <label>
            <span>Почта</span>
            <input ref={emailRef} className={errorField === "email" ? "invalid" : ""} type="email" name="email" autoComplete="email" inputMode="email" placeholder="name@example.com" maxLength={254} required />
          </label>
          <label>
            <span>Пароль</span>
            <input className={errorField === "password" ? "invalid" : ""} type="password" name="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "От 8 символов" : "Ваш пароль"} minLength={isRegister ? 8 : undefined} maxLength={128} required />
          </label>
          {isRegister && <>
            <div className="password-hint">8–128 символов, заглавная и строчная буквы, цифра</div>
            <label>
              <span>Повторите пароль</span>
              <input className={errorField === "confirmation" ? "invalid" : ""} type="password" name="confirmation" autoComplete="new-password" placeholder="Ещё раз для проверки" minLength={8} maxLength={128} required />
            </label>
          </>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Подождите…" : isRegister ? "Зарегистрироваться" : "Войти"}</button>
        </form>
        <div className="auth-divider"><span>или</span></div>
        <TelegramLoginWidget onError={setError} onSuccess={onSuccess} />
        <div className="auth-switch">
          {isRegister ? "Уже есть аккаунт?" : "Впервые в Lina?"}
          <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")}>{isRegister ? "Войти" : "Зарегистрироваться"}</button>
        </div>
      </section>
    </div>
  );
}

type LogoutModalProps = {
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

function LogoutModal({ onClose, onConfirm }: LogoutModalProps) {
  const [pending, setPending] = useState(false);
  const returnButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    returnButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, pending]);

  async function confirmLogout() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !pending && onClose()}>
      <section className="auth-modal logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть" disabled={pending}>×</button>
        <div className="modal-brand"><span className="brand-mark">L</span><span>Lina</span></div>
        <h2 id="logout-title">Вы уверены, что хотите выйти?</h2>
        <p id="logout-description">Чтобы продолжить обучение, вам понадобится снова войти в аккаунт.</p>
        <div className="logout-actions">
          <button className="logout-confirm" type="button" onClick={confirmLogout} disabled={pending}>{pending ? "Выходим…" : "Выйти"}</button>
          <button ref={returnButtonRef} className="logout-return" type="button" onClick={onClose} disabled={pending}>Вернуться</button>
        </div>
      </section>
    </div>
  );
}

function GuestLanding({ telegramError = "" }: { telegramError?: string }) {
  const [authMode, setAuthMode] = useState<AuthMode | null>(telegramError ? "login" : null);

  useEffect(() => {
    const landing = document.querySelector<HTMLElement>(".landing");
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!landing || !elements.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    landing.classList.add("motion-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -7%" });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const openRegister = () => setAuthMode("register");

  return (
    <div className="landing">
      <header className="landing-header">
        <a className="landing-brand" href="#top"><span className="brand-mark">L</span><span>Lina</span></a>
        <nav aria-label="Навигация по странице"><a href="#science">Методика</a><a href="#how">Как работает</a><a href="#research">Исследования</a></nav>
        <div className="landing-auth"><button className="login-button" onClick={() => setAuthMode("login")}>Войти</button><button className="create-button" onClick={openRegister}>Начать запоминать</button></div>
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="eyebrow"><Icon name="spark" size={16}/> Запоминание, основанное на исследованиях</div>
            <h1>Запоминайте надолго.<br/><em>Lina знает, когда повторить.</em></h1>
            <p>Загрузите конспект, документ или фотографию. Lina создаст карточки, составит расписание повторений и напомнит о занятии в Telegram.</p>
            <div className="landing-cta"><button onClick={openRegister}>Запомнить первый материал <span>→</span></button></div>
            <div className="landing-use-cases" aria-label="Примеры материалов"><span>Термины</span><span>Формулы</span><span>Даты</span><span>Определения</span></div>
          </div>
          <div className="landing-system-demo" aria-label="Как Lina превращает материал в запланированное повторение">
            <div className="system-orbit orbit-one"/><div className="system-orbit orbit-two"/>
            <article className="capture-card">
              <span className="demo-icon"><Icon name="camera" size={19}/></span>
              <div><small>Источник</small><strong>Конспект по биологии</strong></div>
              <span className="scan-line"/>
            </article>
            <article className="memory-card">
              <div className="memory-card-top"><span>КАРТОЧКА 12 ИЗ 24</span><i>86%</i></div>
              <strong>Что делает митохондрия?</strong>
              <p>Попробуйте вспомнить ответ</p>
              <div className="memory-actions"><span>Сложно</span><span>Помню</span></div>
            </article>
            <article className="telegram-card">
              <span className="telegram-icon"><Image src="/telegram-logo.png" alt="Telegram" width={42} height={42}/></span>
              <div><small>Lina · сейчас</small><strong>7 карточек пора повторить</strong><p>Я уже всё собрала. Вам осталось только вспомнить.</p></div>
            </article>
          </div>
        </section>

        <section className="landing-proof">
          <p>Вам не нужно планировать собственную память</p>
          <div><span>Загрузите материал</span><i>→</i><span>Lina составит план</span><i>→</i><span>Бот позовёт вовремя</span></div>
        </section>

        <section className="landing-science" id="science">
          <div className="landing-science-copy" data-reveal>
            <span className="section-kicker">Методика</span>
            <h2>Мозг забывает. Это нормально — и довольно предсказуемо.</h2>
            <p>Если возвращаться к материалу через правильно подобранные интервалы, он сохраняется дольше. Lina отслеживает ответы и возвращает карточку тогда, когда памяти уже нужно подкрепление.</p>
            <blockquote>Вы запоминаете. Lina занимается всей математикой вокруг этого.</blockquote>
          </div>
          <div className="forgetting-chart" data-reveal>
            <div className="chart-heading"><span>Прочность памяти</span><b>Повторения</b></div>
            <svg viewBox="0 0 620 300" role="img" aria-label="Схема интервального повторения">
              <defs><linearGradient id="memory-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f36f3d" stopOpacity=".2"/><stop offset="1" stopColor="#f36f3d" stopOpacity="0"/></linearGradient></defs>
              <path className="chart-grid" d="M40 52H590M40 120H590M40 188H590M40 256H590"/>
              <path className="chart-area" d="M40 64C78 88 90 169 112 212C130 151 141 105 164 83C203 111 217 172 245 203C264 149 281 108 306 91C347 119 368 166 397 192C417 149 438 115 464 101C507 125 534 158 577 181V266H40Z"/>
              <path className="chart-line" pathLength="1" d="M40 64C78 88 90 169 112 212C130 151 141 105 164 83C203 111 217 172 245 203C264 149 281 108 306 91C347 119 368 166 397 192C417 149 438 115 464 101C507 125 534 158 577 181"/>
              <g className="chart-points"><circle cx="112" cy="212" r="7"/><circle cx="245" cy="203" r="7"/><circle cx="397" cy="192" r="7"/><circle cx="577" cy="181" r="7"/></g>
            </svg>
            <div className="chart-labels"><span>Сегодня</span><span>Завтра</span><span>Через 3 дня</span><span>Через неделю</span></div>
          </div>
        </section>

        <section className="landing-methods">
          <div className="landing-section-title" data-reveal><span>Три принципа</span><h2>Не магия. Хорошо изученная механика памяти.</h2><p>Lina соединяет техники, которые помогают знаниям задержаться надолго.</p></div>
          <div className="method-grid">
            <article data-reveal style={{ "--reveal-delay": "0ms" } as React.CSSProperties}><span><Icon name="chart"/></span><b>01</b><h3>Интервальное повторение</h3><p>Интервалы постепенно увеличиваются: знакомое возвращается реже, сложное — раньше.</p></article>
            <article data-reveal style={{ "--reveal-delay": "90ms" } as React.CSSProperties}><span><Icon name="brain"/></span><b>02</b><h3>Активное воспроизведение</h3><p>Сначала вы пытаетесь вспомнить ответ и только потом смотрите его. Так память работает, а не наблюдает.</p></article>
            <article data-reveal style={{ "--reveal-delay": "180ms" } as React.CSSProperties}><span><Icon name="spark"/></span><b>03</b><h3>Адаптация под вас</h3><p>Lina учитывает ответы и обновляет расписание. Одинаковых интервалов для всего подряд не будет.</p></article>
          </div>
        </section>

        <section className="landing-how" id="how">
          <div className="landing-section-title" data-reveal><span>Как это работает</span><h2>От материала до долговременной памяти</h2><p>Без ручного расписания и вечера, потраченного на создание карточек.</p></div>
          <div className="landing-steps">
            <article data-reveal><b>01</b><div className="step-visual upload-visual"><Icon name="camera" size={28}/><Icon name="file" size={28}/><span>+ вставить текст</span></div><h3>Загрузите материал</h3><p>Сфотографируйте страницу, импортируйте файл или вставьте готовый текст.</p></article>
            <article data-reveal style={{ "--reveal-delay": "90ms" } as React.CSSProperties}><b>02</b><div className="step-visual cards-stack"><i/><i/><i/></div><h3>Lina создаст карточки</h3><p>Термины, даты, формулы и определения — не только иностранные слова.</p></article>
            <article data-reveal style={{ "--reveal-delay": "180ms" } as React.CSSProperties}><b>03</b><div className="step-visual schedule-visual"><span>1</span><span>3</span><span>7</span><span>14</span></div><h3>Повторяйте по плану</h3><p>Lina выберет нужные карточки, а бот напомнит, когда пора вернуться.</p></article>
          </div>
        </section>

        <section className="landing-telegram">
          <div className="telegram-showcase" data-reveal>
            <div className="telegram-phone-top"><span>9:41</span><b>•••</b></div>
            <div className="telegram-chat-head"><span><Icon name="telegram" size={21}/></span><div><strong>Lina</strong><small>бот для запоминания</small></div></div>
            <div className="telegram-bubble"><p>На сегодня готово 7 карточек.</p><p>Я рассчитала момент, вы рассчитались пятью минутами времени 🤝</p><span>Начать повторение →</span></div>
          </div>
          <div className="landing-telegram-copy" data-reveal>
            <span className="section-kicker">Telegram-напоминания</span>
            <h2>Даже вспоминать о повторении не придётся</h2>
            <p>Когда наступит подходящий момент, Lina напишет в Telegram. Открываете сообщение — и сразу начинаете занятие.</p>
            <ul><li><Icon name="check" size={17}/> Расписание строится по вашим ответам</li><li><Icon name="check" size={17}/> В занятии только то, что пора повторить</li><li><Icon name="check" size={17}/> Никаких календарей и ручных настроек</li></ul>
            <small>Держать расписание в голове не нужно. Там и без него дел хватает.</small>
          </div>
        </section>

        <section className="landing-research" id="research">
          <div className="research-intro" data-reveal><span className="section-kicker">Исследования</span><h2>Не очередной «секрет эффективной учёбы»</h2><p>Распределённая практика и активное воспроизведение изучаются психологами памяти десятилетиями. Исследования показывают: они помогают сохранять знания дольше, чем зубрёжка за один подход и простое перечитывание.</p></div>
          <div className="research-links">
            <a data-reveal href="https://doi.org/10.1037/0033-2909.132.3.354" target="_blank" rel="noreferrer"><span>Метаанализ · 2006</span><strong>Распределённая практика и долговременная память</strong><small>Cepeda et al. ↗</small></a>
            <a data-reveal style={{ "--reveal-delay": "90ms" } as React.CSSProperties} href="https://doi.org/10.1111/j.1467-9280.2008.02209.x" target="_blank" rel="noreferrer"><span>Эксперимент · 2008</span><strong>Как интервал зависит от срока хранения знаний</strong><small>Cepeda et al. ↗</small></a>
            <a data-reveal style={{ "--reveal-delay": "180ms" } as React.CSSProperties} href="https://doi.org/10.1111/j.1467-9280.2006.01693.x" target="_blank" rel="noreferrer"><span>Эксперимент · 2006</span><strong>Почему попытка вспомнить эффективнее перечитывания</strong><small>Roediger & Karpicke ↗</small></a>
          </div>
        </section>

        <section className="landing-final" data-reveal><div className="eyebrow"><Icon name="spark" size={16}/> Начните с одного материала</div><h2>Загрузите то, что хотите запомнить.<br/><em>Lina вернёт это в нужный момент.</em></h2><p>Без ручного создания карточек, расписаний и чувства, что вы опять что-то забыли.</p><button onClick={openRegister}>Начать запоминать <span>→</span></button></section>
      </main>
      <footer className="landing-footer"><a className="landing-brand" href="#top"><span className="brand-mark">L</span><span>Lina</span></a><p>Память любит систему. Lina тоже.</p><span>© {new Date().getFullYear()} Lina</span></footer>
      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onSuccess={() => window.location.reload()} />}
      {telegramError && <div className="telegram-return-error" role="alert">{telegramError}</div>}
    </div>
  );
}

export function HomeClient({
  initialUser,
  initialDashboard,
  initialSidebarCollapsed,
}: {
  initialUser: AuthUser | null;
  initialDashboard: DashboardData | null;
  initialSidebarCollapsed: boolean;
}) {
  const [user, setUser] = useState(initialUser);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [telegramReturnError, setTelegramReturnError] = useState("");
  const [restartingSetId, setRestartingSetId] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const callbackStatus = searchParams.get("telegramAuth");
    if (callbackStatus) {
      void Promise.resolve().then(() => {
        setTelegramReturnError(callbackStatus === "limited"
          ? "Слишком много попыток. Попробуйте позже"
          : "Не удалось подтвердить вход через Telegram");
      });
    }

    if (callbackStatus || searchParams.has("studyExit")) {
      searchParams.delete("telegramAuth");
      searchParams.delete("studyExit");
      const query = searchParams.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }

    const telegramUser = parseTelegramAuthResult(window.location.hash);
    if (!telegramUser) return;

    // A mobile Telegram client can finish in a different browser/WebView.
    // Continue with a full navigation so session creation does not depend on
    // the JavaScript context that originally opened Telegram.
    const callbackUrl = new URL("/api/auth/telegram/callback", window.location.origin);
    for (const [key, value] of Object.entries(telegramUser)) {
      callbackUrl.searchParams.set(key, String(value));
    }
    window.location.replace(callbackUrl);
  }, []);

  function toggleSidebar() {
    const collapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(collapsed);
    document.cookie = `lina-sidebar-collapsed=${collapsed}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      setUser(null);
      setIsLogoutOpen(false);
    }
  }

  async function restartSet(setId: string, openAfterRestart: boolean) {
    if (restartingSetId || !window.confirm("Начать этот набор заново? Текущий прогресс будет сброшен.")) return;
    setRestartingSetId(setId);
    try {
      const response = await fetch(`/api/sets/${setId}/restart`, { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.assign(openAfterRestart ? `/study/${setId}` : "/");
    } catch {
      window.alert("Не удалось начать набор заново. Попробуйте ещё раз.");
      setRestartingSetId(null);
    }
  }

  if (!user || !initialDashboard) {
    return <GuestLanding telegramError={telegramReturnError} />;
  }

  const { stats, recentSets } = initialDashboard;
  const latestSet = recentSets[0];
  const latestSetComplete = Boolean(latestSet && latestSet.count > 0 && latestSet.studiedCount >= latestSet.count);

  return (
    <div className="app-shell">
      <aside className={`sidebar${isSidebarCollapsed ? " collapsed" : ""}`}>
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={isSidebarCollapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
          aria-expanded={!isSidebarCollapsed}
          onClick={toggleSidebar}
        >
          <Icon name={isSidebarCollapsed ? "expand" : "collapse"} size={17} />
        </button>
        <div className="brand"><span className="brand-mark">L</span><span>Lina</span></div>
        <nav className="main-nav" aria-label="Основная навигация">
          <button className={`nav-item${activeTab === "home" ? " active" : ""}`} type="button" onClick={() => setActiveTab("home")} aria-current={activeTab === "home" ? "page" : undefined} title={isSidebarCollapsed ? "Главная" : undefined}><Icon name="home" /><span>Главная</span></button>
          <button className={`nav-item${activeTab === "library" ? " active" : ""}`} type="button" onClick={() => setActiveTab("library")} aria-current={activeTab === "library" ? "page" : undefined} title={isSidebarCollapsed ? "Мои наборы" : undefined}><Icon name="cards" /><span>Мои наборы</span></button>
          <span className="nav-item nav-item-disabled" aria-disabled="true" title="Пока недоступно"><Icon name="chart" /><span>Прогресс</span></span>
          <button className="nav-item mobile-logout-button" type="button" onClick={() => setIsLogoutOpen(true)}><Icon name="logout" /><span>Выйти</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="streak-card">
          <span className="streak-emoji">🔥</span>
          <strong className="streak-count">{stats.streak}</strong>
          <div className="streak-details"><strong>{stats.streak} {stats.streak === 1 ? "день" : "дней"} подряд</strong><p>{stats.streak ? "Продолжайте в том же духе" : "Начните серию сегодня"}</p></div>
        </div>
        <button className="profile-button" onClick={() => setIsLogoutOpen(true)}><span className="avatar">{user.name.charAt(0)}</span><span><strong>{user.name}</strong><small>Выйти из аккаунта</small></span><Icon name="arrow" size={17}/></button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="mobile-topbar-brand"><span className="brand-mark">L</span><span>Lina</span></div>
          <button className="mobile-profile-button" type="button" onClick={() => setIsLogoutOpen(true)} aria-label={`Открыть профиль ${user.name}`}>
            <span className="avatar">{user.name.charAt(0)}</span>
          </button>
          <button className="icon-button" aria-label="Уведомления"><Icon name="bell" /></button>
          <button className="create-button" type="button" onClick={() => setActiveTab("create")}><Icon name="plus" size={19}/>Создать набор</button>
        </header>

        {activeTab === "home" && <section className="mobile-dashboard app-view" aria-label="Продолжить обучение">
          <div className="dashboard-heading"><div><span>Главная</span><h1>Вернуться к учёбе</h1></div><p>Добрый день, {user.name} <span>👋</span></p></div>
          <div className="desktop-dashboard-stats" aria-label="Статистика обучения">
            <div><strong>{stats.cardCount}</strong><span>карточек</span></div>
            <div><strong>{stats.setCount}</strong><span>наборов</span></div>
            <div><strong>{stats.accuracy}%</strong><span>точность</span></div>
          </div>
          <div className="dashboard-grid">
          {latestSet ? (
            <article className="mobile-resume-card">
              <div className="mobile-resume-heading"><h2>{latestSet.title}</h2></div>
              <div className="mobile-resume-progress"><span style={{ width: `${latestSet.progress}%` }} /></div>
              <p>{latestSet.studiedCount}/{latestSet.count} карточек изучено</p>
              {latestSetComplete ? (
                <button className="mobile-resume-primary" type="button" onClick={() => restartSet(latestSet.id, true)} disabled={restartingSetId === latestSet.id}>{restartingSetId === latestSet.id ? "Начинаем…" : "Пройти заново"}</button>
              ) : (
                <Link className="mobile-resume-primary" href={`/study/${latestSet.id}`} transitionTypes={["nav-forward"]}>Продолжить</Link>
              )}
              {latestSet.studiedCount > 0 && !latestSetComplete && (
                <button className="mobile-resume-restart" type="button" onClick={() => restartSet(latestSet.id, true)} disabled={restartingSetId === latestSet.id}>↻ Начать заново</button>
              )}
            </article>
          ) : (
            <div className="sets-empty mobile-sets-empty"><span>Пока здесь тихо</span><h3>Создайте свой первый набор</h3><p>Lina соберёт карточки и сохранит их в вашем аккаунте.</p><button type="button" onClick={() => setActiveTab("create")}>Добавить слова →</button></div>
          )}

          {recentSets.length > 0 && (
            <div className="mobile-recents" id="mobile-recents">
              <h2>Недавние</h2>
              <div className="mobile-recents-list">
                {recentSets.map((set) => (
                  <Link href={`/study/${set.id}`} transitionTypes={["nav-forward"]} className="mobile-recent-set" key={set.id}>
                    <span className={`mobile-set-icon ${set.color}`}><Icon name="cards" size={25}/></span>
                    <span><strong>{set.title}</strong><small>{set.count} карточек · {set.progress}% изучено</small></span>
                    <Icon name="arrow" size={18}/>
                  </Link>
                ))}
              </div>
            </div>
          )}
          </div>
        </section>}

        {activeTab === "create" && (
          <section className="mobile-tab-screen mobile-create-screen app-view" aria-label="Создание набора">
            <div className="dashboard-heading"><div><span>Новый набор</span><h1>Создать</h1></div><p>Добавьте слова удобным способом</p></div>
            <CreateMethodPicker />
          </section>
        )}

        {activeTab === "library" && (
          <section className="mobile-tab-screen mobile-library-screen app-view" aria-label="Библиотека наборов">
            <div className="dashboard-heading"><div><span>Все материалы</span><h1>Библиотека</h1></div><button type="button" onClick={() => setActiveTab("create")}><Icon name="plus" size={18}/> Новый набор</button></div>
            {recentSets.length ? (
              <div className="mobile-recents-list">
                {recentSets.map((set) => (
                  <Link href={`/study/${set.id}`} transitionTypes={["nav-forward"]} className="mobile-recent-set" key={set.id}>
                    <span className={`mobile-set-icon ${set.color}`}><Icon name="cards" size={25}/></span>
                    <span><strong>{set.title}</strong><small>{set.count} карточек · {set.progress}% изучено</small></span>
                    <Icon name="arrow" size={18}/>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="sets-empty mobile-sets-empty"><span>Пока здесь тихо</span><h3>Создайте свой первый набор</h3><button type="button" onClick={() => setActiveTab("create")}>Создать набор →</button></div>
            )}
          </section>
        )}
      </main>
      <nav className="mobile-bottom-nav" data-active-tab={activeTab} aria-label="Мобильная навигация">
        <span className="mobile-nav-indicator" aria-hidden="true" />
        <button className={`mobile-nav-item${activeTab === "home" ? " active" : ""}`} type="button" onClick={() => setActiveTab("home")} aria-current={activeTab === "home" ? "page" : undefined}><Icon name="home" size={24}/><span>Главная</span></button>
        <button className={`mobile-nav-item${activeTab === "create" ? " active" : ""}`} type="button" onClick={() => setActiveTab("create")} aria-current={activeTab === "create" ? "page" : undefined}><Icon name="plus" size={25}/><span>Создать</span></button>
        <button className={`mobile-nav-item${activeTab === "library" ? " active" : ""}`} type="button" onClick={() => setActiveTab("library")} aria-current={activeTab === "library" ? "page" : undefined}><Icon name="cards" size={24}/><span>Библиотека</span></button>
        <span className="mobile-nav-item mobile-nav-disabled" aria-disabled="true"><Icon name="spark" size={24}/><span>Пробный</span></span>
      </nav>
      {isLogoutOpen && <LogoutModal onClose={() => setIsLogoutOpen(false)} onConfirm={logout} />}
    </div>
  );
}
