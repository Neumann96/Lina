import Link from "next/link";
import { PublicHeader } from "@/components/marketing/public-header";
import { StructuredData } from "@/components/structured-data";
import { SITE_URL } from "@/lib/seo";

export type MarketingSection = {
  eyebrow?: string;
  title: string;
  intro?: string;
  items?: Array<{ title: string; text: string }>;
  paragraphs?: string[];
  bullets?: string[];
};

type MarketingPageProps = {
  path: string;
  eyebrow: string;
  title: string;
  lead: string;
  sections: MarketingSection[];
  ctaTitle?: string;
  ctaText?: string;
  article?: boolean;
};

export function MarketingHeader() {
  return <PublicHeader />;
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div>
        <Link className="marketing-brand" href="/"><span>L</span><strong>Lina</strong></Link>
        <p>Карточки и повторения по расписанию — для знаний, которые должны остаться надолго.</p>
      </div>
      <nav aria-label="Возможности">
        <strong>Возможности</strong>
        <Link href="/features/spaced-repetition">Интервальные повторения</Link>
        <Link href="/features/card-import">Создание и импорт</Link>
        <Link href="/features/telegram-reminders">Telegram-напоминания</Link>
      </nav>
      <nav aria-label="Для кого">
        <strong>Для кого</strong>
        <Link href="/for-school">Школьникам</Link>
        <Link href="/for-students">Студентам</Link>
        <Link href="/for-language-learning">Для языков</Link>
        <Link href="/for-exams">Для экзаменов</Link>
      </nav>
      <nav aria-label="О Lina">
        <strong>О Lina</strong>
        <Link href="/science">Научная основа</Link>
        <Link href="/about">О продукте</Link>
        <Link href="/privacy">Конфиденциальность</Link>
        <Link href="/terms">Условия</Link>
      </nav>
      <small>© {new Date().getFullYear()} Lina</small>
    </footer>
  );
}

export function MarketingPage({
  path,
  eyebrow,
  title,
  lead,
  sections,
  ctaTitle = "Создайте первый набор карточек",
  ctaText = "Lina бесплатна: добавьте материал и начните повторять без тарифов и банковской карты.",
  article = false,
}: MarketingPageProps) {
  const schema = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: lead,
        inLanguage: "ru",
        mainEntityOfPage: new URL(path, SITE_URL).toString(),
        author: { "@type": "Organization", name: "Lina" },
        publisher: { "@type": "Organization", name: "Lina", url: SITE_URL },
        dateModified: "2026-07-27",
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description: lead,
        inLanguage: "ru",
        url: new URL(path, SITE_URL).toString(),
        isPartOf: { "@type": "WebSite", name: "Lina", url: SITE_URL },
      };

  return (
    <div className="marketing-page">
      <StructuredData data={schema} />
      <PublicHeader />
      <main>
        <nav className="marketing-breadcrumbs" aria-label="Хлебные крошки">
          <Link href="/">Lina</Link><span>›</span><span>{title}</span>
        </nav>
        <header className="marketing-hero">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{lead}</p>
          <div>
            <Link href="/signup">Начать бесплатно <span>→</span></Link>
            <Link href="/how-it-works">Посмотреть, как работает</Link>
          </div>
        </header>

        <div className="marketing-content">
          {sections.map((section) => (
            <section key={section.title}>
              {section.eyebrow && <span className="marketing-kicker">{section.eyebrow}</span>}
              <h2>{section.title}</h2>
              {section.intro && <p className="marketing-intro">{section.intro}</p>}
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items && (
                <div className="marketing-card-grid">
                  {section.items.map((item) => (
                    <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>
                  ))}
                </div>
              )}
              {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
            </section>
          ))}
        </div>

        <section className="marketing-cta">
          <span>Бесплатно сейчас</span>
          <h2>{ctaTitle}</h2>
          <p>{ctaText}</p>
          <Link href="/signup">Начать запоминать <span>→</span></Link>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
