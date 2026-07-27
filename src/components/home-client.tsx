"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateMethodPicker } from "@/components/create-method-picker";
import { FolderLibrary } from "@/components/folder-library";
import { PublicHeader } from "@/components/marketing/public-header";
import type { AuthUser } from "@/lib/auth";
import type { LibraryData, LibraryStudySet, StudyFolder } from "@/lib/folders";
import type { DashboardData } from "@/lib/learning";
import { safeAppPath } from "@/lib/navigation";
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
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M15 8l2 2M17 6l2 2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

type AuthMode = "register" | "login";
type AppTab = "home" | "create" | "library";

type AuthModalProps = {
  mode: AuthMode;
  nextPath: string;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: (user: AuthUser) => void;
};

function TelegramLoginWidget({
  nextPath,
  onError,
  onSuccess,
}: {
  nextPath: string;
  onError: (message: string) => void;
  onSuccess: (user: AuthUser) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoLoginAttempted = useRef(false);
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
        const setup = await response.json() as { botUsername?: string; state?: string; error?: string };
        if (!response.ok || !setup.botUsername || !setup.state) {
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
        const callbackUrl = new URL("/api/auth/telegram/callback", window.location.origin);
        callbackUrl.searchParams.set("state", setup.state);
        callbackUrl.searchParams.set("next", safeAppPath(nextPath));
        window.sessionStorage.setItem("lina-telegram-state", setup.state);
        script.setAttribute("data-auth-url", callbackUrl.toString());
        script.onload = () => {
          if (!controller.signal.aborted) container.classList.add("is-ready");
        };
        script.onerror = () => onError("Не удалось загрузить Telegram. Обновите страницу и попробуйте ещё раз");
        container.replaceChildren(script);
      } catch (error) {
        if (controller.signal.aborted) return;
        onError(error instanceof Error ? error.message : "Вход через Telegram пока недоступен");
      }
    })();

    return () => {
      controller.abort();
      container?.classList.remove("is-ready");
      container?.replaceChildren();
    };
  }, [nextPath, onError]);

  const loginWithMiniApp = useCallback(async () => {
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
  }, [onError, onSuccess]);

  useEffect(() => {
    if (!window.Telegram?.WebApp?.initData || autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;
    void loginWithMiniApp();
  }, [loginWithMiniApp]);

  return <>
    <div ref={containerRef} className="telegram-login-widget"><span className="telegram-widget-loading"><Icon name="telegram" size={19}/>Загружаем Telegram…</span></div>
    <button className="telegram-login telegram-mini-app-login" type="button" onClick={loginWithMiniApp} disabled={miniAppPending}>
      {miniAppPending ? "Входим через Telegram…" : "Войти через Telegram"}
    </button>
  </>;
}

function AuthModal({ mode, nextPath, onClose, onModeChange, onSuccess }: AuthModalProps) {
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldsInteractive, setFieldsInteractive] = useState(false);
  const inputInteractionRef = useRef(false);
  const isRegister = mode === "register";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const clearUnexpectedInputFocus = () => {
      if (inputInteractionRef.current) return;
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLInputElement && activeElement.closest(".auth-modal")) {
        activeElement.blur();
      }
    };
    clearUnexpectedInputFocus();
    const animationFrame = window.requestAnimationFrame(clearUnexpectedInputFocus);
    const focusGuardTimeout = window.setTimeout(clearUnexpectedInputFocus, 300);
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(focusGuardTimeout);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function enableInput(event: React.PointerEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) {
    inputInteractionRef.current = true;
    event.currentTarget.readOnly = false;
    setFieldsInteractive(true);
  }

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
            <input className={errorField === "email" ? "invalid" : ""} type="email" name="email" autoComplete="email" inputMode="email" placeholder="name@example.com" maxLength={254} readOnly={!fieldsInteractive} onPointerDown={enableInput} onKeyDown={enableInput} required />
          </label>
          <label>
            <span>Пароль</span>
            <input className={errorField === "password" ? "invalid" : ""} type="password" name="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "От 8 символов" : "Ваш пароль"} minLength={isRegister ? 8 : undefined} maxLength={128} readOnly={!fieldsInteractive} onPointerDown={enableInput} onKeyDown={enableInput} required />
          </label>
          {isRegister && <>
            <div className="password-hint">8–128 символов, заглавная и строчная буквы, цифра</div>
            <label>
              <span>Повторите пароль</span>
              <input className={errorField === "confirmation" ? "invalid" : ""} type="password" name="confirmation" autoComplete="new-password" placeholder="Ещё раз для проверки" minLength={8} maxLength={128} readOnly={!fieldsInteractive} onPointerDown={enableInput} onKeyDown={enableInput} required />
            </label>
          </>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Подождите…" : isRegister ? "Зарегистрироваться" : "Войти"}</button>
        </form>
        <div className="auth-divider"><span>или</span></div>
        <TelegramLoginWidget nextPath={nextPath} onError={setError} onSuccess={onSuccess} />
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

function formatAccountDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(date);
}

function ProfileModal({
  user,
  stats,
  onClose,
  onLogout,
}: {
  user: AuthUser;
  stats: DashboardData["stats"];
  onClose: () => void;
  onLogout: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const studiedPercent = stats.cardCount
    ? Math.round(stats.studiedCardCount / stats.cardCount * 100)
    : 0;
  const telegramAccount = user.telegramUsername
    ? `@${user.telegramUsername}`
    : user.telegramId
      ? `Telegram ID ${user.telegramId}`
      : "Не привязан";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="auth-overlay profile-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button ref={closeButtonRef} className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <header className="profile-identity">
          <span className="profile-avatar">{user.name.charAt(0)}</span>
          <div>
            <span>Ваш аккаунт</span>
            <h2 id="profile-title">{user.name}</h2>
            <p>С Lina с {formatAccountDate(user.createdAt)}</p>
          </div>
        </header>

        <div className="profile-stats" aria-label="Статистика аккаунта">
          <div><strong>{stats.cardCount}</strong><span>всего карточек</span></div>
          <div><strong>{stats.studiedCardCount}</strong><span>изучено</span></div>
          <div><strong>{stats.setCount}</strong><span>наборов</span></div>
          <div><strong>{studiedPercent}%</strong><span>пройдено</span></div>
        </div>

        <section className="profile-details" aria-labelledby="profile-details-title">
          <h3 id="profile-details-title">Личные данные</h3>
          <div>
            <span className="profile-detail-icon"><Icon name="user" size={18}/></span>
            <span><small>Имя</small><strong>{user.name}</strong></span>
          </div>
          <div>
            <span className="profile-detail-icon"><Icon name="mail" size={18}/></span>
            <span><small>Почта</small><strong>{user.email ?? "Не указана"}</strong></span>
          </div>
          <div>
            <span className="profile-detail-icon telegram"><Icon name="telegram" size={18}/></span>
            <span><small>Telegram</small><strong>{telegramAccount}</strong></span>
          </div>
          <div>
            <span className="profile-detail-icon"><Icon name="key" size={18}/></span>
            <span><small>Текущий вход</small><strong>{user.loginMethod === "telegram" ? "Через Telegram" : "Почта и пароль"}</strong></span>
          </div>
        </section>

        <footer className="profile-footer">
          <span><Icon name="calendar" size={16}/> Серия: {stats.streak} дней</span>
          <button type="button" onClick={onLogout}><Icon name="logout" size={18}/>Выйти из аккаунта</button>
        </footer>
      </section>
    </div>
  );
}

export function GuestLanding({
  initialAuthMode = null,
  telegramError = "",
  authNextPath = "/app",
}: {
  initialAuthMode?: AuthMode | null;
  telegramError?: string;
  authNextPath?: string;
}) {
  const router = useRouter();
  const nextPath = safeAppPath(authNextPath);
  const [authMode, setAuthMode] = useState<AuthMode | null>(initialAuthMode);

  useEffect(() => {
    const landing = document.querySelector<HTMLElement>(".landing");
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const methodCards = Array.from(document.querySelectorAll<HTMLElement>(".method-grid article"));
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

    const glowTimers: number[] = [];
    const mobileGlowObserver = window.matchMedia("(max-width: 600px)").matches
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const card = entry.target as HTMLElement;
            card.classList.add("is-scroll-lit");
            mobileGlowObserver?.unobserve(card);
            glowTimers.push(window.setTimeout(() => card.classList.remove("is-scroll-lit"), 1800));
          });
        }, { threshold: 0.5, rootMargin: "0px 0px -8%" })
      : null;

    methodCards.forEach((card) => mobileGlowObserver?.observe(card));

    return () => {
      observer.disconnect();
      mobileGlowObserver?.disconnect();
      glowTimers.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    const telegramUser = parseTelegramAuthResult(window.location.hash);
    if (!telegramUser) return;

    const callbackUrl = new URL("/api/auth/telegram/callback", window.location.origin);
    const telegramState = window.sessionStorage.getItem("lina-telegram-state");
    if (!telegramState) {
      const failedUrl = new URL("/login", window.location.origin);
      failedUrl.searchParams.set("telegramAuth", "failed");
      failedUrl.searchParams.set("next", nextPath);
      window.location.replace(failedUrl);
      return;
    }
    callbackUrl.searchParams.set("state", telegramState);
    callbackUrl.searchParams.set("next", nextPath);
    window.sessionStorage.removeItem("lina-telegram-state");
    for (const [key, value] of Object.entries(telegramUser)) {
      callbackUrl.searchParams.set(key, String(value));
    }
    window.location.replace(callbackUrl);
  }, [nextPath]);

  function changeAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    const query = nextPath === "/app" ? "" : `?next=${encodeURIComponent(nextPath)}`;
    router.replace(`/${mode === "login" ? "login" : "signup"}${query}`);
  }

  return (
    <div className="landing">
      <PublicHeader />

      <main id="top">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="eyebrow"><Icon name="spark" size={16}/> Запоминание, основанное на исследованиях</div>
            <h1>Запоминайте надолго.<br/><em>Lina знает, когда повторить.</em></h1>
            <p>Создайте карточки вручную, вставьте готовый список или перенесите публичный набор Quizlet. Lina составит расписание повторений и напомнит о занятии в Telegram.</p>
            <div className="landing-cta"><Link href="/signup">Запомнить первый материал <span>→</span></Link></div>
            <div className="landing-use-cases" aria-label="Примеры материалов"><Link href="/for-school">Школа</Link><Link href="/for-students">Учёба</Link><Link href="/for-language-learning">Языки</Link><Link href="/for-exams">Экзамены</Link></div>
          </div>
          <div className="landing-system-demo" aria-label="Как Lina превращает материал в запланированное повторение">
            <div className="system-orbit orbit-one"/><div className="system-orbit orbit-two"/>
            <article className="capture-card">
              <span className="demo-icon"><Icon name="file" size={19}/></span>
              <div><small>Источник</small><strong>Конспект по биологии</strong></div>
              <span className="scan-line"/>
            </article>
            <article className="memory-card">
              <div className="memory-card-top"><span>КАРТОЧКА 12 ИЗ 24</span><i>86%</i></div>
              <strong>Что делает митохондрия?</strong>
              <p>Попробуйте вспомнить ответ</p>
              <div className="memory-actions"><span>Сложно</span><span>Помню</span></div>
            </article>
            <article className="telegram-card telegram-notification">
              <div className="telegram-notification-app"><Image src="/telegram-logo.png" alt="" width={20} height={20}/><span>TELEGRAM</span><time>сейчас</time></div>
              <div className="telegram-notification-body"><strong>Lina</strong><p>Пора повторить 7 карточек. Это займёт около пяти минут.</p></div>
            </article>
          </div>
        </section>

        <section className="landing-proof">
          <p>Вам не нужно планировать собственную память</p>
          <div><span>Добавьте карточки</span><i>→</i><span>Lina составит план</span><i>→</i><span>Бот позовёт вовремя</span></div>
        </section>

        <section className="landing-science" id="science">
          <div className="landing-science-copy" data-reveal>
            <span className="section-kicker">Методика</span>
            <h2>Мозг забывает. Это нормально — и довольно предсказуемо.</h2>
            <p>Если сначала попытаться вспомнить материал, получить обратную связь и вернуться к нему через интервал, он сохраняется дольше. Lina начинает с 3, 7 и 14 дней для уверенных ответов, возвращает сложное завтра, а затем адаптирует расписание по истории каждой карточки.</p>
            <blockquote>Вы запоминаете. Lina занимается всей математикой вокруг этого.</blockquote>
          </div>
          <div className="forgetting-chart" data-reveal>
            <div className="chart-heading"><div><strong>Кривая забывания</strong><span>Чем выше линия, тем лучше материал сохраняется в памяти</span></div><div className="chart-legend"><span className="memory-low"><i/> забывание</span><span className="memory-restored"><i/> повторение</span></div></div>
            <svg viewBox="0 0 620 310" role="img" aria-label="Сохранение материала в памяти с течением времени и после повторений">
              <defs>
                <linearGradient id="memory-line" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#42a977"/><stop offset=".48" stopColor="#58b584"/><stop offset=".68" stopColor="#d8a064"/><stop offset=".82" stopColor="#df6a63"/><stop offset="1" stopColor="#dc565e"/></linearGradient>
                <linearGradient id="memory-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62c08f" stopOpacity=".13"/><stop offset="1" stopColor="#62c08f" stopOpacity="0"/></linearGradient>
                <filter id="memory-glow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
              </defs>
              <g className="chart-axis-copy"><text x="46" y="24">Сохранение в памяти</text><text x="592" y="300" textAnchor="end">Время после изучения →</text></g>
              <g className="chart-y-ticks"><text x="7" y="59">100%</text><text x="14" y="143">50%</text><text x="21" y="227">0</text></g>
              <path className="chart-grid" d="M46 54H592M46 138H592M46 222H592"/>
              <path className="chart-area" d="M46 54C79 54 96 218 126 218C157 218 169 84 198 84C237 84 260 204 294 204C329 204 347 104 382 104C428 104 452 188 494 188C532 188 557 126 584 126V244H46Z"/>
              <path className="chart-line-glow" pathLength="1" filter="url(#memory-glow)" d="M46 54C79 54 96 218 126 218C157 218 169 84 198 84C237 84 260 204 294 204C329 204 347 104 382 104C428 104 452 188 494 188C532 188 557 126 584 126"/>
              <path className="chart-line" pathLength="1" d="M46 54C79 54 96 218 126 218C157 218 169 84 198 84C237 84 260 204 294 204C329 204 347 104 382 104C428 104 452 188 494 188C532 188 557 126 584 126"/>
              <g className="chart-points chart-valleys"><circle cx="126" cy="218" r="4"/><circle cx="294" cy="204" r="4"/><circle cx="494" cy="188" r="4"/></g>
              <g className="chart-points chart-peaks"><circle cx="46" cy="54" r="4"/><circle cx="198" cy="84" r="4"/><circle cx="382" cy="104" r="4"/><circle cx="584" cy="126" r="4"/></g>
              <g className="chart-x-ticks"><text x="46" y="264">сейчас</text><text x="198" y="264" textAnchor="middle">1 день</text><text x="382" y="264" textAnchor="middle">3 дня</text><text x="584" y="264" textAnchor="end">7 дней</text></g>
            </svg>
          </div>
        </section>

        <section className="landing-methods">
          <div className="landing-section-title" data-reveal><span>Три принципа</span><h2>Не магия. Хорошо изученная механика мозга.</h2><p>Lina соединяет техники, которые помогают знаниям задержаться надолго.</p></div>
          <div className="method-grid">
            <article data-reveal style={{ "--reveal-delay": "0ms" } as React.CSSProperties}><span><Icon name="chart"/></span><h3>Интервальное повторение</h3><p>Уверенный ответ запускает интервалы 3 → 7 → 14 дней. «С трудом» и «не вспомнил» возвращаются завтра.</p></article>
            <article data-reveal style={{ "--reveal-delay": "90ms" } as React.CSSProperties}><span><Icon name="brain"/></span><h3>Активное воспроизведение</h3><p>Сначала вы формулируете ответ, затем видите эталон и оцениваете попытку. Ошибка возвращается ещё раз в конце занятия.</p></article>
            <article data-reveal style={{ "--reveal-delay": "180ms" } as React.CSSProperties}><span><Icon name="spark"/></span><h3>Адаптация под вас</h3><p>Lina учитывает уверенность, скорость ответа и забывания. После стартовых интервалов расписание становится персональным.</p></article>
          </div>
        </section>

        <section className="landing-how" id="how">
          <div className="landing-section-title" data-reveal><span>Как это работает</span><h2>От материала до долговременной памяти</h2><p>Без ручного расписания и вечера, потраченного на создание карточек.</p></div>
          <div className="landing-steps">
            <article data-reveal><div className="step-visual upload-visual"><Icon name="file" size={28}/><span>+ вставить текст</span></div><h3>Добавьте материал</h3><p>Создайте карточки вручную, вставьте список или перенесите публичный набор Quizlet.</p></article>
            <article data-reveal style={{ "--reveal-delay": "90ms" } as React.CSSProperties}><div className="step-visual cards-stack"><i/><i/><i/></div><h3>Проверьте карточки</h3><p>Исправьте пары перед сохранением: термины, даты, формулы и определения.</p></article>
            <article data-reveal style={{ "--reveal-delay": "180ms" } as React.CSSProperties}><div className="step-visual schedule-visual"><span><small>ПН</small><strong>16</strong></span><span><small>ВТ</small><strong>17</strong></span><span><small>СР</small><strong>18</strong></span><span><small>ЧТ</small><strong>19</strong></span><span><small>ПТ</small><strong>20</strong></span></div><h3>Повторяйте по плану</h3><p>Lina выберет нужные карточки, а бот напомнит, когда пора вернуться.</p></article>
          </div>
        </section>

        <section className="landing-telegram" id="telegram-reminders">
          <div className="telegram-showcase" data-reveal>
            <div className="telegram-phone-top"><span>9:41</span><b>•••</b></div>
            <div className="telegram-chat-head"><span><Icon name="telegram" size={21}/></span><div><strong>Lina</strong><small>бот для запоминания</small></div></div>
            <div className="telegram-conversation">
              <div className="telegram-typing" aria-hidden="true"><i/><i/><i/></div>
              <div className="telegram-bubble"><p>Привет! Пора немного освежить память 👋</p><p>На сегодня — 7 карточек. Займёт около пяти минут.</p><span>Начать повторение →</span></div>
            </div>
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
          <div className="research-intro" data-reveal><span className="section-kicker">Исследования</span><h2>Не очередной «секрет эффективной учёбы»</h2><p>Метаанализы подтверждают пользу распределённой практики и воспроизведения вместо перечитывания; исследования иностранной лексики и персональных расписаний показывают, что эти принципы работают и в прикладном обучении. Точные дни не универсальны: 3–7–14 — стартовая политика Lina, которую дальше корректируют ваши ответы.</p></div>
          <div className="research-links">
            <a data-reveal href="https://doi.org/10.1037/0033-2909.132.3.354" target="_blank" rel="noreferrer"><span>Метаанализ · 2006</span><strong>Распределённая практика и долговременная память</strong><small>Cepeda et al. ↗</small></a>
            <a data-reveal style={{ "--reveal-delay": "70ms" } as React.CSSProperties} href="https://doi.org/10.1037/a0037559" target="_blank" rel="noreferrer"><span>Метаанализ · 2014</span><strong>Тестирование против повторного чтения</strong><small>Rowland ↗</small></a>
            <a data-reveal style={{ "--reveal-delay": "140ms" } as React.CSSProperties} href="https://doi.org/10.1126/science.1152408" target="_blank" rel="noreferrer"><span>Иностранная лексика · Science</span><strong>Почему повторное извлечение закрепляет знания</strong><small>Karpicke & Roediger ↗</small></a>
            <a data-reveal style={{ "--reveal-delay": "210ms" } as React.CSSProperties} href="https://doi.org/10.1177/0956797613504302" target="_blank" rel="noreferrer"><span>Учебный курс · 2014</span><strong>Персональное расписание против единого</strong><small>Lindsey et al. ↗</small></a>
          </div>
        </section>

        <section className="landing-final" data-reveal><h2>Добавьте то, что хотите запомнить.<br/><em>Lina вернёт это в нужный момент.</em></h2><p>Без ручного расписания и чувства, что вы опять что-то забыли.</p><Link href="/signup">Начать запоминать <span>→</span></Link></section>
      </main>
      <footer className="landing-footer"><Link className="landing-brand" href="/"><span className="brand-mark">L</span><span>Lina</span></Link><p>Память любит систему. Lina тоже.</p><nav aria-label="Ссылки в подвале"><Link href="/about">О Lina</Link><Link href="/privacy">Конфиденциальность</Link><Link href="/terms">Условия</Link></nav><a className="landing-footer-telegram" href="https://t.me/linalernbot?start=start" target="_blank" rel="noreferrer" aria-label="Открыть бота Lina в Telegram"><Image src="/telegram-logo.png" alt="" width={34} height={34}/></a><span>© {new Date().getFullYear()} Lina</span></footer>
      {authMode && <AuthModal mode={authMode} nextPath={nextPath} onClose={() => router.push("/")} onModeChange={changeAuthMode} onSuccess={() => window.location.assign(nextPath)} />}
      {telegramError && <div className="telegram-return-error" role="alert">{telegramError}</div>}
    </div>
  );
}

export function HomeClient({
  initialUser,
  initialDashboard,
  initialLibrary,
  initialSidebarCollapsed,
  initialActiveTab = "home",
}: {
  initialUser: AuthUser | null;
  initialDashboard: DashboardData | null;
  initialLibrary: LibraryData | null;
  initialSidebarCollapsed: boolean;
  initialActiveTab?: AppTab;
}) {
  const user = initialUser;
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const activeTab = initialActiveTab;
  const [restartingSetId, setRestartingSetId] = useState<string | null>(null);

  function toggleSidebar() {
    const collapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(collapsed);
    document.cookie = `lina-sidebar-collapsed=${collapsed}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) {
      window.location.assign("/");
    }
  }

  function handleSetDeleted(deletedSet: LibraryStudySet) {
    setDashboard((current) => {
      if (!current) return current;
      const nextDueCount = Math.max(0, current.stats.dueReviewCount - deletedSet.dueCount);
      const deletedScopeKind = deletedSet.folderId ? "folder" : "unfiled";
      const deletedScopeId = deletedSet.folderId ?? "all";
      return {
        ...current,
        stats: {
          ...current.stats,
          cardCount: Math.max(0, current.stats.cardCount - deletedSet.count),
          studiedCardCount: Math.max(0, current.stats.studiedCardCount - deletedSet.studiedCount),
          setCount: Math.max(0, current.stats.setCount - 1),
          dueReviewCount: nextDueCount,
        },
        recentSets: current.recentSets.filter((set) => set.id !== deletedSet.id),
        reviewGroups: current.reviewGroups
          .map((group) => group.scopeKind === deletedScopeKind && group.scopeId === deletedScopeId
            ? { ...group, dueCount: Math.max(0, group.dueCount - deletedSet.dueCount) }
            : group)
          .filter((group) => group.dueCount > 0),
      };
    });
  }

  function handleSetMoved(movedSet: LibraryStudySet, targetFolder: StudyFolder | null) {
    if (!movedSet.dueCount || movedSet.folderId === targetFolder?.id) return;

    setDashboard((current) => {
      if (!current) return current;

      const oldScopeKind = movedSet.folderId ? "folder" : "unfiled";
      const oldScopeId = movedSet.folderId ?? "all";
      const newScopeKind = targetFolder ? "folder" : "unfiled";
      const newScopeId = targetFolder?.id ?? "all";
      const nextGroups = current.reviewGroups
        .map((group) => group.scopeKind === oldScopeKind && group.scopeId === oldScopeId
          ? { ...group, dueCount: Math.max(0, group.dueCount - movedSet.dueCount) }
          : group)
        .filter((group) => group.dueCount > 0);
      const hasTargetGroup = nextGroups.some(
        (group) => group.scopeKind === newScopeKind && group.scopeId === newScopeId,
      );

      return {
        ...current,
        reviewGroups: hasTargetGroup
          ? nextGroups.map((group) => group.scopeKind === newScopeKind && group.scopeId === newScopeId
            ? { ...group, dueCount: group.dueCount + movedSet.dueCount }
            : group)
          : [...nextGroups, {
          scopeKind: newScopeKind,
          scopeId: newScopeId,
          title: targetFolder?.name ?? "Без папки",
          dueCount: movedSet.dueCount,
          href: `/app/reviews/${newScopeKind}/${newScopeId}`,
        }],
      };
    });
  }

  function handleFolderRenamed(folder: StudyFolder) {
    setDashboard((current) => current
      ? {
        ...current,
        reviewGroups: current.reviewGroups.map((group) => group.scopeKind === "folder" && group.scopeId === folder.id
          ? { ...group, title: folder.name }
          : group),
      }
      : current);
  }

  function handleFolderDeleted(folder: StudyFolder, folderSets: LibraryStudySet[]) {
    setDashboard((current) => {
      if (!current) return current;

      let nextGroups = current.reviewGroups.filter(
        (group) => group.scopeKind !== "folder" || group.scopeId !== folder.id,
      );
      const movedDueCount = folderSets.reduce((sum, set) => sum + set.dueCount, 0);
      if (movedDueCount > 0) {
        const hasUnfiledGroup = nextGroups.some(
          (group) => group.scopeKind === "unfiled" && group.scopeId === "all",
        );
        nextGroups = hasUnfiledGroup
          ? nextGroups.map((group) => group.scopeKind === "unfiled" && group.scopeId === "all"
            ? { ...group, dueCount: group.dueCount + movedDueCount }
            : group)
          : [...nextGroups, {
            scopeKind: "unfiled",
            scopeId: "all",
            title: "Без папки",
            dueCount: movedDueCount,
            href: "/app/reviews/unfiled/all",
          }];
      }

      return { ...current, reviewGroups: nextGroups };
    });
  }

  async function restartSet(setId: string, openAfterRestart: boolean) {
    if (restartingSetId || !window.confirm("Начать этот набор заново? Текущий прогресс будет сброшен.")) return;
    setRestartingSetId(setId);
    try {
      const response = await fetch(`/api/sets/${setId}/restart`, { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.assign(openAfterRestart ? `/app/study/${setId}` : "/app");
    } catch {
      window.alert("Не удалось начать набор заново. Попробуйте ещё раз.");
      setRestartingSetId(null);
    }
  }

  if (!user || !dashboard || !initialLibrary) {
    return null;
  }

  const { stats, recentSets } = dashboard;
  const latestSet = recentSets[0];
  const latestSetComplete = Boolean(latestSet && latestSet.count > 0 && latestSet.studiedCount >= latestSet.count);
  const dueReviewLabel = stats.dueReviewCount > 99 ? "99+" : String(stats.dueReviewCount);
  const firstReviewGroup = dashboard.reviewGroups[0];
  const firstReviewHref = firstReviewGroup?.href ?? "/app/reviews";

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
          <Link className={`nav-item${activeTab === "home" ? " active" : ""}`} href="/app" transitionTypes={["nav-back"]} aria-current={activeTab === "home" ? "page" : undefined} title={isSidebarCollapsed ? "Главная" : undefined}><Icon name="home" /><span>Главная</span></Link>
          <Link className={`nav-item${activeTab === "library" ? " active" : ""}`} href="/app/library" transitionTypes={["nav-forward"]} aria-current={activeTab === "library" ? "page" : undefined} title={isSidebarCollapsed ? "Папки" : undefined}><Icon name="folder" /><span>Папки</span></Link>
          <Link className={`nav-item${activeTab === "create" ? " active" : ""}`} href="/app/sets/new" transitionTypes={["nav-forward"]} aria-current={activeTab === "create" ? "page" : undefined} title={isSidebarCollapsed ? "Создать набор" : undefined}><Icon name="plus" /><span>Создать набор</span></Link>
          <span className="nav-item nav-item-disabled" aria-disabled="true" title="Пока недоступно"><Icon name="chart" /><span>Прогресс</span></span>
          <button className="nav-item mobile-logout-button" type="button" onClick={() => setIsLogoutOpen(true)}><Icon name="logout" /><span>Выйти</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="streak-card">
          <span className="streak-emoji">🔥</span>
          <strong className="streak-count">{stats.streak}</strong>
          <div className="streak-details"><strong>{stats.streak} {stats.streak === 1 ? "день" : "дней"} подряд</strong><p>{stats.streak ? "Продолжайте в том же духе" : "Начните серию сегодня"}</p></div>
        </div>
        <button className="profile-button" onClick={() => setIsProfileOpen(true)}><span className="avatar">{user.name.charAt(0)}</span><span><strong>{user.name}</strong><small>Профиль и аккаунт</small></span><Icon name="arrow" size={17}/></button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="mobile-topbar-brand"><span className="brand-mark">L</span><span>Lina</span></div>
          <button className="mobile-profile-button" type="button" onClick={() => setIsProfileOpen(true)} aria-label={`Открыть профиль ${user.name}`}>
            <span className="avatar">{user.name.charAt(0)}</span>
          </button>
          <Link className={`icon-button review-bell${stats.dueReviewCount ? " has-due" : ""}`} href={firstReviewHref} transitionTypes={["nav-forward"]} aria-label={stats.dueReviewCount ? `Повторить ${stats.dueReviewCount} карточек` : "Нет карточек для повторения"}>
            <Icon name="bell" />
            {stats.dueReviewCount > 0 && <span>{dueReviewLabel}</span>}
          </Link>
          <Link className="create-button" href="/app/sets/new" transitionTypes={["nav-forward"]}><Icon name="plus" size={19}/>Создать набор</Link>
        </header>

        {activeTab === "home" && <section className="mobile-dashboard app-view" aria-label="Продолжить обучение">
          <div className="dashboard-heading"><div><span>Главная</span><h1>Вернуться к учёбе</h1></div><p>Добрый день, {user.name} <span>👋</span></p></div>
          <div className="desktop-dashboard-stats" aria-label="Статистика обучения">
            <div><strong>{stats.cardCount}</strong><span>карточек</span></div>
            <div><strong>{stats.setCount}</strong><span>наборов</span></div>
            <div><strong>{stats.accuracy}%</strong><span>точность</span></div>
            <div><strong>{stats.dueReviewCount}</strong><span>к повторению</span></div>
          </div>
          {stats.dueReviewCount > 0 && (
            <section className="today-review-section" aria-labelledby="today-review-title">
              <span className="today-review-icon"><Icon name="bell" size={24}/></span>
              <div className="today-review-copy">
                <span>Очереди по папкам</span>
                <h2 id="today-review-title">Повторение на сегодня</h2>
                <p>Темы разделены: карточки из разных папок не перемешиваются.</p>
              </div>
              <div className="today-review-count"><strong>{stats.dueReviewCount}</strong><span>карточек</span></div>
              <div className="today-review-groups">
                {dashboard.reviewGroups.map((group) => (
                  <Link className="today-review-group" href={group.href} transitionTypes={["nav-forward"]} key={`${group.scopeKind}:${group.scopeId}`}>
                    <span>
                      <small>{group.scopeKind === "folder" ? "Папка" : "Общая очередь"}</small>
                      <strong>{group.title}</strong>
                    </span>
                    <b>{group.dueCount}</b>
                    <Icon name="arrow" size={18}/>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <div className="dashboard-grid">
          {latestSet ? (
            <article className="mobile-resume-card">
              <div className="mobile-resume-heading"><h2>{latestSet.title}</h2></div>
              <div className="mobile-resume-progress"><span style={{ width: `${latestSet.progress}%` }} /></div>
              <p>{latestSet.studiedCount}/{latestSet.count} карточек изучено</p>
              {latestSetComplete ? (
                <button className="mobile-resume-primary" type="button" onClick={() => restartSet(latestSet.id, true)} disabled={restartingSetId === latestSet.id}>{restartingSetId === latestSet.id ? "Начинаем…" : "Пройти заново"}</button>
              ) : (
                <Link className="mobile-resume-primary" href={`/app/study/${latestSet.id}`} transitionTypes={["nav-forward"]}>Продолжить</Link>
              )}
              {latestSet.studiedCount > 0 && !latestSetComplete && (
                <button className="mobile-resume-restart" type="button" onClick={() => restartSet(latestSet.id, true)} disabled={restartingSetId === latestSet.id}>↻ Начать заново</button>
              )}
            </article>
          ) : (
            <div className="sets-empty mobile-sets-empty"><span>Пока здесь тихо</span><h3>Создайте свой первый набор</h3><p>Lina соберёт карточки и сохранит их в вашем аккаунте.</p><Link href="/app/sets/new" transitionTypes={["nav-forward"]}>Добавить слова →</Link></div>
          )}

          {recentSets.length > 0 && (
            <div className="mobile-recents" id="mobile-recents">
              <h2>Недавние</h2>
              <div className="mobile-recents-list">
                {recentSets.map((set) => (
                  <Link href={`/app/study/${set.id}`} transitionTypes={["nav-forward"]} className="mobile-recent-set" key={set.id}>
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
          <section className="mobile-tab-screen mobile-library-screen app-view" aria-label="Папки и наборы">
            <FolderLibrary
              initialLibrary={initialLibrary}
              embedded
              onSetDeleted={handleSetDeleted}
              onSetMoved={handleSetMoved}
              onFolderRenamed={handleFolderRenamed}
              onFolderDeleted={handleFolderDeleted}
            />
          </section>
        )}
      </main>
      <nav className="mobile-bottom-nav" data-active-tab={activeTab} aria-label="Мобильная навигация">
        <span className="mobile-nav-indicator" aria-hidden="true" />
        <Link className={`mobile-nav-item${activeTab === "home" ? " active" : ""}`} href="/app" transitionTypes={["nav-back"]} aria-current={activeTab === "home" ? "page" : undefined}><Icon name="home" size={24}/><span>Главная</span></Link>
        <Link className={`mobile-nav-item${activeTab === "create" ? " active" : ""}`} href="/app/sets/new" transitionTypes={["nav-forward"]} aria-current={activeTab === "create" ? "page" : undefined}><Icon name="plus" size={25}/><span>Создать</span></Link>
        <Link className={`mobile-nav-item${activeTab === "library" ? " active" : ""}`} href="/app/library" transitionTypes={["nav-forward"]} aria-current={activeTab === "library" ? "page" : undefined}><Icon name="folder" size={24}/><span>Папки</span></Link>
        <span className="mobile-nav-item mobile-nav-disabled" aria-disabled="true"><Icon name="spark" size={24}/><span>Пробный</span></span>
      </nav>
      {isProfileOpen && (
        <ProfileModal
          user={user}
          stats={stats}
          onClose={() => setIsProfileOpen(false)}
          onLogout={() => {
            setIsProfileOpen(false);
            setIsLogoutOpen(true);
          }}
        />
      )}
      {isLogoutOpen && <LogoutModal onClose={() => setIsLogoutOpen(false)} onConfirm={logout} />}
    </div>
  );
}
