import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { marketingMetadata } from "@/lib/seo";

const description = "Lina для студентов: превращайте термины и определения из конспектов в карточки и повторяйте их по персональному расписанию.";

export const metadata: Metadata = marketingMetadata({
  title: "Карточки для студентов",
  description,
  path: "/for-students",
});

export default function ForStudentsPage() {
  return <MarketingPage
    path="/for-students"
    eyebrow="Для студентов"
    title="Чтобы материал оставался после зачёта"
    lead={description}
    sections={[
      {
        title: "Разделите большой курс на тематические наборы",
        items: [
          { title: "Лекции", text: "Переносите ключевые термины и вопросы из готового списка." },
          { title: "Модули", text: "Храните наборы в папках по дисциплинам и темам." },
          { title: "Повторение", text: "Возвращайтесь не ко всему конспекту, а к карточкам с наступившим сроком." },
        ],
      },
      {
        title: "Проверка ответа важнее ощущения знакомости",
        paragraphs: [
          "Lina просит сначала сформулировать ответ, а уже затем показывает эталон. Такой формат помогает отличить реальное воспроизведение от простого узнавания знакомого текста.",
        ],
      },
      {
        title: "Продолжайте с любого устройства",
        bullets: [
          "Аккаунт хранит наборы и прогресс.",
          "Недавнее занятие доступно с главной страницы приложения.",
          "Telegram-напоминание открывает нужную очередь.",
        ],
      },
    ]}
  />;
}
