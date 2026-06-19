import { BulkCardEditor } from "@/components/bulk-card-editor";

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

export default function Home() {
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
        <button className="profile-button"><span className="avatar">Н</span><span><strong>Никита</strong><small>Бесплатный план</small></span><Icon name="arrow" size={17}/></button>
      </aside>

      <main className="content">
        <header className="topbar">
          <label className="search"><Icon name="search" size={19}/><input aria-label="Поиск" placeholder="Найти набор или слово" /></label>
          <button className="icon-button" aria-label="Уведомления"><Icon name="bell" /></button>
          <a className="create-button" href="#new-set"><Icon name="plus" size={19}/>Создать набор</a>
        </header>

        <section className="hero">
          <div className="eyebrow"><Icon name="spark" size={16}/> Учись быстрее, а не дольше</div>
          <h1>Добрый день, Никита <span>👋</span></h1>
          <p>Продолжим с того места, где остановились?</p>
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

        <section className="section editor-section" id="new-set">
          <div className="section-heading"><div><span>Новый набор</span><h2>Добавь всё одним движением</h2></div></div>
          <BulkCardEditor />
        </section>
      </main>
    </div>
  );
}
