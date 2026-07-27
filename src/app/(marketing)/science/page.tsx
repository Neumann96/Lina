import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { marketingMetadata } from "@/lib/seo";

const description = "Научная основа Lina: распределённая практика, активное воспроизведение, обратная связь и персональное расписание повторений.";

export const metadata: Metadata = marketingMetadata({
  title: "Научная основа",
  description,
  path: "/science",
});

export default function SciencePage() {
  return <MarketingPage
    path="/science"
    eyebrow="Научная основа"
    title="Lina переводит исследования памяти в понятные действия"
    lead={description}
    article
    sections={[
      {
        title: "Распределённая практика",
        paragraphs: [
          "Метаанализ Cepeda и соавторов показал устойчивое преимущество распределённой практики для долговременного запоминания. Исследование также подчёркивает: полезный интервал зависит от того, как долго материал должен храниться.",
        ],
      },
      {
        title: "Активное воспроизведение вместо перечитывания",
        paragraphs: [
          "Метаанализ Rowland показал преимущество попытки извлечь материал из памяти над повторным изучением. Поэтому Lina сначала просит сформулировать ответ и лишь затем показывает эталон.",
          "Ошибка не завершает работу с карточкой: забытый материал возвращается в текущем занятии, чтобы пользователь снова добился успешного воспроизведения.",
        ],
      },
      {
        title: "Персонализация по истории ответов",
        paragraphs: [
          "В учебном эксперименте Lindsey и соавторов персонализированное расписание превзошло единое интервальное повторение. Lina использует оценки, успешные повторения, забывания и время попытки, чтобы постепенно отходить от стартовой схемы.",
        ],
      },
      {
        title: "Основные источники",
        bullets: [
          "Cepeda et al. (2006), Distributed practice in verbal recall tasks — doi.org/10.1037/0033-2909.132.3.354",
          "Rowland (2014), The effect of testing versus restudy on retention — doi.org/10.1037/a0037559",
          "Karpicke & Roediger (2008), The critical importance of retrieval for learning — doi.org/10.1126/science.1152408",
          "Lindsey et al. (2014), Improving students’ long-term knowledge retention — doi.org/10.1177/0956797613504302",
          "Kim & Webb (2022), The effects of spaced practice on second language learning — doi.org/10.1111/lang.12479",
        ],
      },
    ]}
  />;
}
