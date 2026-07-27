import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { marketingMetadata } from "@/lib/seo";

const description = "Учите иностранные слова с Lina: двусторонние карточки, активное воспроизведение и интервальные повторения.";

export const metadata: Metadata = marketingMetadata({
  title: "Карточки для изучения иностранных слов",
  description,
  path: "/for-language-learning",
});

export default function ForLanguageLearningPage() {
  return <MarketingPage
    path="/for-language-learning"
    eyebrow="Изучение языков"
    title="Слова, которые возвращаются в нужный момент"
    lead={description}
    sections={[
      {
        title: "Учите в обоих направлениях",
        paragraphs: [
          "В занятии можно менять направление карточек: вспоминать перевод по иностранному слову или, наоборот, иностранное слово по переводу.",
        ],
      },
      {
        title: "Быстро переносите готовые списки",
        items: [
          { title: "Текст", text: "Вставьте пары по одной на строку и проверьте автоматическое разделение." },
          { title: "Quizlet", text: "Перенесите публичный набор по ссылке." },
          { title: "Вручную", text: "Добавляйте собственные примеры, фразы и формулировки." },
        ],
      },
      {
        title: "Не перечитывайте весь словарь",
        paragraphs: [
          "Карточки получают отдельные сроки повторения. Знакомые слова постепенно появляются реже, а забытые возвращаются уже в текущем занятии и на следующий день.",
        ],
      },
    ]}
  />;
}
