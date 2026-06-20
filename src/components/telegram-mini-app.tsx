"use client";

import { useEffect } from "react";

type EdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type TelegramWebApp = {
  initData?: string;
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  safeAreaInset?: EdgeInsets;
  contentSafeAreaInset?: EdgeInsets;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const insetVariables = {
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
} as const;

function writeInsets(prefix: string, insets?: EdgeInsets) {
  for (const [key, suffix] of Object.entries(insetVariables)) {
    const value = insets?.[key as keyof EdgeInsets] ?? 0;
    document.documentElement.style.setProperty(`--tg-${prefix}-${suffix}`, `${value}px`);
  }
}

export function TelegramMiniApp() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    // The SDK is loaded on every page, including ordinary desktop browsers.
    // Only signed initData proves that the page is running as a Mini App.
    if (!webApp?.initData) return;

    const root = document.documentElement;
    const updateInsets = () => {
      writeInsets("safe-area-inset", webApp.safeAreaInset);
      writeInsets("content-safe-area-inset", webApp.contentSafeAreaInset);
    };

    root.classList.add("telegram-mini-app");
    updateInsets();
    webApp.setHeaderColor?.("#ffffff");
    webApp.setBackgroundColor?.("#f7f6f3");
    webApp.ready();
    webApp.expand();

    try {
      webApp.requestFullscreen?.();
    } catch {
      // Older Telegram clients still receive the expanded layout.
    }

    webApp.onEvent("safeAreaChanged", updateInsets);
    webApp.onEvent("contentSafeAreaChanged", updateInsets);
    webApp.onEvent("viewportChanged", updateInsets);

    return () => {
      webApp.offEvent("safeAreaChanged", updateInsets);
      webApp.offEvent("contentSafeAreaChanged", updateInsets);
      webApp.offEvent("viewportChanged", updateInsets);
      root.classList.remove("telegram-mini-app");
    };
  }, []);

  return null;
}
