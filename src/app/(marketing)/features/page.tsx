import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-page";
import { marketingMetadata } from "@/lib/seo";

const description = "Возможности Lina: создание и импорт карточек, папки, активное воспроизведение, интервальные повторения и напоминания в Telegram.";

export const metadata: Metadata = marketingMetadata({
  title: "Возможности",
  description,
  path: "/features",
});

const features = [
  { href: "/features/card-import", title: "Создание и импорт карточек", text: "Вручную, из готового текста или публичного набора Quizlet." },
  { href: "/features/spaced-repetition", title: "Интервальные повторения", text: "Стартовое расписание и адаптация по истории каждой карточки." },
  { href: "/features/telegram-reminders", title: "Telegram-напоминания", text: "Переход из сообщения сразу к очереди карточек в Mini App." },
];

export default function FeaturesPage() {
  return (
    <div className="marketing-page">
      <MarketingHeader />
      <main>
        <nav className="marketing-breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Lina</Link><span>›</span><span>Возможности</span></nav>
        <header className="marketing-hero">
          <span>Возможности Lina</span>
          <h1>От карточки до следующего уверенного ответа</h1>
          <p>{description}</p>
          <div><Link href="/signup">Начать бесплатно <span>→</span></Link><Link href="/how-it-works">Как работает Lina</Link></div>
        </header>
        <section className="marketing-feature-index">
          {features.map((feature, index) => (
            <Link href={feature.href} key={feature.href}>
              <span>0{index + 1}</span><div><h2>{feature.title}</h2><p>{feature.text}</p></div><b>→</b>
            </Link>
          ))}
        </section>
        <section className="marketing-cta"><span>Бесплатно сейчас</span><h2>Попробуйте на своём материале</h2><p>Lina работает с терминами, словами, датами, формулами и определениями.</p><Link href="/signup">Создать набор <span>→</span></Link></section>
      </main>
      <MarketingFooter />
    </div>
  );
}
