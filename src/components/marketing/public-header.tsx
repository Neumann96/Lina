import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="landing-header">
      <Link className="landing-brand" href="/">
        <span className="brand-mark">L</span>
        <span>Lina</span>
      </Link>
      <nav aria-label="Основная навигация">
        <Link href="/how-it-works">Как работает</Link>
        <Link href="/features">Возможности</Link>
        <Link href="/science">Методика</Link>
        <Link href="/guides">Материалы</Link>
      </nav>
      <div className="landing-auth">
        <Link className="login-button" href="/login">Войти</Link>
        <Link className="create-button" href="/signup">Начать бесплатно</Link>
      </div>
    </header>
  );
}
