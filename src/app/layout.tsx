import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { TelegramMiniApp } from "@/components/telegram-mini-app";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lina — учить легко",
  description: "Быстрые карточки для изучения слов без лишней рутины.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
      <Script src="https://telegram.org/js/telegram-web-app.js?61" strategy="beforeInteractive" />
      <Script src="https://oauth.telegram.org/js/telegram-login.js?5" strategy="afterInteractive" />
      <TelegramMiniApp />
    </html>
  );
}
