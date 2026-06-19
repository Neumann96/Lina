import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lina — учить легко",
  description: "Быстрые карточки для изучения слов без лишней рутины.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
