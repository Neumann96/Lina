import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { marketingMetadata } from "@/lib/seo";

const description = "Lina для школьников: карточки для терминов, дат, формул, слов и определений с повторением по расписанию.";

export const metadata: Metadata = marketingMetadata({
  title: "Карточки для школьников",
  description,
  path: "/for-school",
});

export default function ForSchoolPage() {
  return <MarketingPage
    path="/for-school"
    eyebrow="Для школьников"
    title="Учить параграфы небольшими понятными шагами"
    lead={description}
    sections={[
      {
        title: "Что можно перенести в карточки",
        items: [
          { title: "История и обществознание", text: "Даты, события, понятия, участники и причинно-следственные связи." },
          { title: "Биология и география", text: "Термины, процессы, объекты, признаки и классификации." },
          { title: "Языки и точные предметы", text: "Слова, правила, формулы, обозначения и короткие алгоритмы." },
        ],
      },
      {
        title: "Подготовка без ночного марафона",
        paragraphs: [
          "Набор можно начать заранее и проходить небольшими очередями. Lina возвращает карточки через интервалы и показывает, какие темы действительно требуют внимания.",
        ],
      },
      {
        title: "Подходит для самостоятельной работы",
        bullets: [
          "Создание собственных наборов по уроку или главе.",
          "Папки для предметов и тем.",
          "Повторение в браузере или Telegram Mini App.",
          "Редактирование карточек, если формулировка оказалась неудобной.",
        ],
      },
    ]}
  />;
}
