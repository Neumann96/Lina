"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { BulkCardEditor } from "@/components/bulk-card-editor";
import type { AuthUser } from "@/lib/auth";

const recentSets = [
  { title: "English · Travel", count: 48, progress: 72, color: "coral" },
  { title: "Испанский · База", count: 32, progress: 41, color: "cream" },
  { title: "Product terms", count: 24, progress: 88, color: "violet" },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    cards: <><rect x="4" y="5" width="15" height="14" rx="3"/><path d="M8 9h7M8 13h4"/><path d="M7 5V3h13a2 2 0 0 1 2 2v11h-3"/></>,
    chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    spark: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

type AuthMode = "register" | "login";

type AuthModalProps = {
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: (user: AuthUser) => void;
};

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
        <div className="auth-switch">
          {isRegister ? "Уже есть аккаунт?" : "Впервые в Lina?"}
          <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")}>{isRegister ? "Войти" : "Зарегистрироваться"}</button>
        </div>
      </section>
    </div>
  );
}

export function HomeClient({ initialUser }: { initialUser: AuthUser | null }) {
  const [user, setUser] = useState(initialUser);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span><span>Lina</span></div>
        <nav className="main-nav" aria-label="Основная навигация">
          <a className="nav-item active" href="#"><Icon name="home" />Главная</a>
          <a className="nav-item" href="#sets"><Icon name="cards" />Мои наборы</a>
          <a className="nav-item" href="#progress"><Icon name="chart" />Прогресс</a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="streak-card">
          <span className="streak-emoji">🔥</span>
          <div><strong>7 дней подряд</strong><p>Ещё немного — и рекорд</p></div>
        </div>
        {user ? (
          <button className="profile-button" onClick={logout}><span className="avatar">{user.name.charAt(0)}</span><span><strong>{user.name}</strong><small>Выйти из аккаунта</small></span><Icon name="arrow" size={17}/></button>
        ) : (
          <button className="profile-button guest-profile" onClick={() => setAuthMode("login")}><span className="avatar">?</span><span><strong>Войти</strong><small>Сохраняйте свой прогресс</small></span><Icon name="arrow" size={17}/></button>
        )}
      </aside>

      <main className="content">
        <header className="topbar">
          {user ? <>
            <button className="icon-button" aria-label="Уведомления"><Icon name="bell" /></button>
            <a className="create-button" href="#new-set"><Icon name="plus" size={19}/>Создать набор</a>
          </> : <>
            <button className="login-button" onClick={() => setAuthMode("login")}>Войти</button>
            <button className="create-button" onClick={() => setAuthMode("register")}>Зарегистрироваться</button>
          </>}
        </header>

        <section className="hero">
          <div className="eyebrow"><Icon name="spark" size={16}/> Учись быстрее, а не дольше</div>
          <h1>{user ? `Добрый день, ${user.name}` : "Учите слова легко"} <span>👋</span></h1>
          <p>{user ? "Продолжим с того места, где остановились?" : "Создайте аккаунт, чтобы сохранять наборы и свой прогресс"}</p>
          <div className="hero-stats">
            <div><strong>104</strong><span>слов изучено</span></div><i />
            <div><strong>12</strong><span>наборов</span></div><i />
            <div><strong>86%</strong><span>точность</span></div>
          </div>
        </section>

        <section className="section" id="sets">
          <div className="section-heading"><div><span>Библиотека</span><h2>Недавние наборы</h2></div><button>Смотреть все <Icon name="arrow" size={16}/></button></div>
          <div className="sets-grid">
            {recentSets.map((set) => (
              <article className={`set-card ${set.color}`} key={set.title}>
                <div className="set-card-top"><span>{set.count} карточек</span><button aria-label="Открыть набор"><Icon name="arrow" size={18}/></button></div>
                <h3>{set.title}</h3>
                <div className="progress-label"><span>Прогресс</span><strong>{set.progress}%</strong></div>
                <div className="progress-track"><span style={{ width: `${set.progress}%` }} /></div>
              </article>
            ))}
          </div>
        </section>

        {user && <section className="section editor-section" id="new-set">
          <div className="section-heading"><div><span>Новый набор</span><h2>Добавь всё одним движением</h2></div></div>
          <BulkCardEditor />
        </section>}
      </main>
      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onSuccess={(nextUser) => { setUser(nextUser); setAuthMode(null); }} />}
    </div>
  );
}
