import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { marketingMetadata } from "@/lib/seo";

const description = "Lina напоминает в Telegram о карточках, которые пора повторить, и открывает нужную очередь прямо в Mini App.";

export const metadata: Metadata = marketingMetadata({
  title: "Напоминания о повторении в Telegram",
  description,
  path: "/features/telegram-reminders",
});

export default function TelegramRemindersPage() {
  return <MarketingPage
    path="/features/telegram-reminders"
    eyebrow="Telegram Mini App"
    title="Сообщение приходит тогда, когда есть что повторять"
    lead={description}
    sections={[
      {
        title: "Из напоминания — сразу в занятие",
        bullets: [
          "Бот проверяет, наступил ли срок повторения.",
          "В сообщении указано количество карточек и тема.",
          "Кнопка открывает нужную очередь в Telegram Mini App.",
          "Карточки из разных папок не смешиваются в одной тематической очереди.",
        ],
      },
      {
        title: "Один аккаунт в браузере и Telegram",
        paragraphs: [
          "В Mini App Lina использует подписанные Telegram данные для безопасного входа. После авторизации доступны те же наборы, папки, прогресс и расписание.",
        ],
      },
      {
        title: "Без ручного календаря",
        paragraphs: [
          "Пользователю не нужно самостоятельно рассчитывать даты. После каждой оценки Lina обновляет срок следующего повторения, а бот сообщает, когда очередь готова.",
        ],
      },
    ]}
  />;
}
