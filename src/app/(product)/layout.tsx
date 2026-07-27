import Script from "next/script";
import { TelegramMiniApp } from "@/components/telegram-mini-app";
import "../folders.css";
import "../study-session.css";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Script src="https://telegram.org/js/telegram-web-app.js?61" strategy="beforeInteractive" />
      <TelegramMiniApp />
    </>
  );
}
