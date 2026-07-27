import Script from "next/script";
import { TelegramMiniApp } from "@/components/telegram-mini-app";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Script src="https://telegram.org/js/telegram-web-app.js?61" strategy="beforeInteractive" />
      <TelegramMiniApp />
    </>
  );
}
