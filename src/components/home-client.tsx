"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { BulkCardEditor } from "@/components/bulk-card-editor";
import type { AuthUser } from "@/lib/auth";
import type { DashboardData } from "@/lib/learning";

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
    spark: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

type AuthMode = "register" | "login";

type TelegramLoginResult = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

function telegramLoginApi() {
  return (window as typeof window & {
    Telegram?: {
      Login?: {
        auth: (
          options: { bot_id: number; lang?: string },
          callback: (result: TelegramLoginResult | false) => void,
        ) => void;
      };
    };
  }).Telegram?.Login;
}

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

  async function loginWithTelegram() {
    setError("");
    setErrorField("");
    setPending(true);
    let popupOpened = false;

    try {
      const setupResponse = await fetch("/api/auth/telegram", { cache: "no-store" });
      const setup = await setupResponse.json() as { botId?: string; error?: string };
      if (!setupResponse.ok || !setup.botId) {
        setError(setup.error ?? "Вход через Telegram пока недоступен");
        return;
      }

      const telegramLogin = telegramLoginApi();
      if (!telegramLogin) {
        setError("Не удалось загрузить Telegram. Обновите страницу и попробуйте ещё раз");
        return;
      }

      telegramLogin.auth(
        { bot_id: Number(setup.botId), lang: "ru" },
        (result) => {
          if (!result) {
            setPending(false);
            return;
          }
          void authenticateWithTelegram(result);
        },
      );
      popupOpened = true;
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз");
    } finally {
      if (!popupOpened) setPending(false);
    }
  }

  async function authenticateWithTelegram(telegramUser: TelegramLoginResult) {
    setError("");
    try {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUser }),
      });
      const authResult = await response.json() as { user?: AuthUser; error?: string };
      if (!response.ok || !authResult.user) {
        setError(authResult.error ?? "Не удалось войти через Telegram");
        return;
      }
      onSuccess(authResult.user);
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
        <button className="telegram-login" type="button" onClick={loginWithTelegram} disabled={pending}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M21.6 3.2 18.5 20c-.2 1.2-.9 1.5-1.9.9l-4.7-3.5-2.3 2.2c-.2.3-.5.5-1 .5l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2L6.2 14 1.5 12.5c-1-.3-1-1 .2-1.5L20 3.9c.8-.3 1.6.2 1.6-.7Z"/></svg>
          Войти через Telegram
        </button>
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

function GuestLanding() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  return (
    <div className="landing">
      <header className="landing-header">
        <a className="landing-brand" href="#top"><span className="brand-mark">L</span><span>Lina</span></a>
        <nav aria-label="Навигация по странице"><a href="#how">Как это работает</a><a href="#features">Возможности</a></nav>
        <div className="landing-auth"><button className="login-button" onClick={() => setAuthMode("login")}>Войти</button><button className="create-button" onClick={() => setAuthMode("register")}>Зарегистрироваться</button></div>
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="eyebrow"><Icon name="spark" size={16}/> Слова остаются с вами</div>
            <h1>Запоминайте слова,<br/><em>а не списки</em></h1>
            <p>Lina превращает любой список в удобные карточки и помогает повторять именно то, что вот-вот забудется.</p>
            <div className="landing-cta"><button onClick={() => setAuthMode("register")}>Начать бесплатно <span>→</span></button><small>Без карты · займёт меньше минуты</small></div>
          </div>
          <div className="landing-demo" aria-label="Пример карточки Lina">
            <div className="demo-toolbar"><span><i/> Lina · English</span><b>12 / 24</b></div>
            <div className="demo-card-back" />
            <article className="demo-card"><span>СЛОВО</span><strong>serendipity</strong><p>счастливая случайность</p><button type="button">Знаю это слово</button></article>
            <div className="demo-progress"><span style={{ width: "62%" }}/></div>
          </div>
        </section>

        <section className="landing-proof">
          <p>Один спокойный ритуал вместо хаоса в заметках</p>
          <div><span>Вставьте список</span><i>→</i><span>Получите карточки</span><i>→</i><span>Повторяйте с умом</span></div>
        </section>

        <section className="landing-how" id="how">
          <div className="landing-section-title"><span>Как это работает</span><h2>От списка до знания — три шага</h2><p>Никакой ручной возни с каждой карточкой.</p></div>
          <div className="landing-steps">
            <article><b>01</b><div className="step-visual paste-lines"><i/><i/><i/></div><h3>Вставьте слова</h3><p>Скопируйте пары из таблицы, заметок или учебника. Lina разберёт разные разделители.</p></article>
            <article><b>02</b><div className="step-visual cards-stack"><i/><i/><i/></div><h3>Проверьте карточки</h3><p>Исправьте перевод, добавьте контекст — всё видно сразу, ещё до сохранения.</p></article>
            <article><b>03</b><div className="step-visual progress-ring">86<small>%</small></div><h3>Следите за ростом</h3><p>Точность, серии занятий и прогресс считаются отдельно для вашего аккаунта.</p></article>
          </div>
        </section>

        <section className="landing-features" id="features">
          <div><span>Меньше подготовки</span><h2>Учёба начинается сразу</h2><p>Массовое добавление карточек, аккуратная библиотека и честная статистика без лишнего шума.</p><button onClick={() => setAuthMode("register")}>Создать первый набор</button></div>
          <ul><li><Icon name="spark"/><span><strong>Умный импорт</strong><small>Tab, тире, двоеточие, точка с запятой или запятая</small></span></li><li><Icon name="chart"/><span><strong>Настоящий прогресс</strong><small>Только ваши наборы, ответы и дни занятий</small></span></li><li><Icon name="cards"/><span><strong>Всё в одном месте</strong><small>Возвращайтесь к наборам с любого устройства</small></span></li></ul>
        </section>

        <section className="landing-final"><div className="eyebrow"><Icon name="spark" size={16}/> Начните с одного списка</div><h2>Пусть новые слова<br/>наконец останутся с вами</h2><button onClick={() => setAuthMode("register")}>Попробовать Lina бесплатно <span>→</span></button></section>
      </main>
      <footer className="landing-footer"><a className="landing-brand" href="#top"><span className="brand-mark">L</span><span>Lina</span></a><p>Учитесь быстрее, а не дольше.</p><span>© {new Date().getFullYear()} Lina</span></footer>
      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onSuccess={() => window.location.reload()} />}
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

  if (!user || !initialDashboard) {
    return <GuestLanding />;
  }

  const { stats, recentSets } = initialDashboard;

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
          <a className="nav-item active" href="#" title={isSidebarCollapsed ? "Главная" : undefined}><Icon name="home" /><span>Главная</span></a>
          <a className="nav-item" href="#sets" title={isSidebarCollapsed ? "Мои наборы" : undefined}><Icon name="cards" /><span>Мои наборы</span></a>
          <span className="nav-item nav-item-disabled" aria-disabled="true" title="Пока недоступно"><Icon name="chart" /><span>Прогресс</span></span>
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
          <button className="icon-button" aria-label="Уведомления"><Icon name="bell" /></button>
          <a className="create-button" href="#new-set"><Icon name="plus" size={19}/>Создать набор</a>
        </header>

        <section className="hero">
          <div className="eyebrow"><Icon name="spark" size={16}/> Учись быстрее, а не дольше</div>
          <h1>Добрый день, {user.name} <span>👋</span></h1>
          <p>Продолжим с того места, где остановились?</p>
          <div className="hero-stats">
            <div><strong>{stats.cardCount}</strong><span>карточек</span></div><i />
            <div><strong>{stats.setCount}</strong><span>наборов</span></div><i />
            <div><strong>{stats.accuracy}%</strong><span>точность</span></div>
          </div>
        </section>

        <section className="section" id="sets">
          <div className="section-heading"><div><span>Библиотека</span><h2>Недавние наборы</h2></div><button>Смотреть все <Icon name="arrow" size={16}/></button></div>
          <div className={`sets-grid${recentSets.length === 0 ? " empty" : ""}`}>
            {recentSets.length === 0 ? <div className="sets-empty"><span>Пока здесь тихо</span><h3>Создайте свой первый набор</h3><p>Вставьте список ниже — Lina соберёт карточки и сохранит их в вашем аккаунте.</p><a href="#new-set">Добавить слова →</a></div> : recentSets.map((set) => (
              <article className={`set-card ${set.color}`} key={set.id}>
                <div className="set-card-top"><span>{set.count} карточек</span><button aria-label="Открыть набор"><Icon name="arrow" size={18}/></button></div>
                <h3>{set.title}</h3>
                <div className="progress-label"><span>Прогресс</span><strong>{set.progress}%</strong></div>
                <div className="progress-track"><span style={{ width: `${set.progress}%` }} /></div>
              </article>
            ))}
          </div>
        </section>

        <section className="section editor-section" id="new-set">
          <div className="section-heading"><div><span>Новый набор</span><h2>Добавь всё одним движением</h2></div></div>
          <BulkCardEditor onCreated={() => window.location.reload()} />
        </section>
      </main>
      {isLogoutOpen && <LogoutModal onClose={() => setIsLogoutOpen(false)} onConfirm={logout} />}
    </div>
  );
}
