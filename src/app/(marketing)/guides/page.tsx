import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-page";
import { GUIDES } from "@/lib/guide-content";
import { marketingMetadata } from "@/lib/seo";

const description = "Материалы Lina об интервальном повторении, активном воспроизведении и создании эффективных учебных карточек.";

export const metadata: Metadata = marketingMetadata({
  title: "Материалы о запоминании",
  description,
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <div className="marketing-page">
      <MarketingHeader />
      <main>
        <nav className="marketing-breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Lina</Link><span>›</span><span>Материалы</span></nav>
        <header className="marketing-hero">
          <span>Материалы Lina</span>
          <h1>Как запоминать материал осмысленно</h1>
          <p>{description}</p>
        </header>
        <section className="marketing-guide-index">
          {GUIDES.map((guide) => (
            <article key={guide.slug}>
              <span>{guide.eyebrow}</span>
              <h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2>
              <p>{guide.description}</p>
              <Link href={`/guides/${guide.slug}`}>Читать руководство <span>→</span></Link>
            </article>
          ))}
        </section>
        <section className="marketing-cta"><span>Практика в Lina</span><h2>Примените метод на своём материале</h2><p>Создайте набор и начните с первой попытки воспроизведения.</p><Link href="/signup">Начать бесплатно <span>→</span></Link></section>
      </main>
      <MarketingFooter />
    </div>
  );
}
