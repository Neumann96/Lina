import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { marketingMetadata } from "@/lib/seo";

const description = "Создавайте учебные карточки вручную, из списка терминов или переносите публичный набор Quizlet в Lina.";

export const metadata: Metadata = marketingMetadata({
  title: "Создание и импорт учебных карточек",
  description,
  path: "/features/card-import",
});

export default function CardImportPage() {
  return <MarketingPage
    path="/features/card-import"
    eyebrow="Создание карточек"
    title="Карточки из готового материала — без долгой разметки"
    lead={description}
    sections={[
      {
        title: "Три работающих способа",
        items: [
          { title: "Добавить вручную", text: "Введите термин и определение, добавляйте и удаляйте карточки до сохранения." },
          { title: "Вставить список", text: "Lina разделяет пары по запятой, табуляции, двоеточию, тире и другим распространённым разделителям." },
          { title: "Перенести Quizlet", text: "Укажите ссылку на публичный набор, проверьте импортированные пары и сохраните их в аккаунте." },
        ],
      },
      {
        title: "Перед сохранением всё можно проверить",
        bullets: [
          "Исправить термин или определение.",
          "Добавить название набора.",
          "Не сохранять пустые и незавершённые пары.",
          "Позднее отредактировать уже созданный набор.",
        ],
      },
      {
        title: "Подходит не только для иностранных слов",
        paragraphs: [
          "На одной стороне карточки может быть вопрос, термин, дата или формула, а на другой — перевод, определение, событие или объяснение. Lina не ограничивает карточки языковыми парами.",
        ],
      },
    ]}
  />;
}
