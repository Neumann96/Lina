import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ViewTransition } from "react";
import { TelegramMiniApp } from "@/components/telegram-mini-app";
import "./globals.css";
import "./folders.css";

export const metadata: Metadata = {
  title: "Lina — запоминайте надолго",
  description: "Карточки из фото и документов, интервальное повторение и напоминания в Telegram — для любых знаний.",
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
      <body>
        <ViewTransition
          default="app-route"
          enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "app-route" }}
          exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "app-route" }}
        >
          {children}
        </ViewTransition>
      </body>
      <Script src="https://telegram.org/js/telegram-web-app.js?61" strategy="beforeInteractive" />
      <TelegramMiniApp />
    </html>
  );
}
