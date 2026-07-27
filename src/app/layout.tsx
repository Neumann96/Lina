import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { DEFAULT_DESCRIPTION, SITE_URL, SOCIAL_IMAGE } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Lina",
  title: {
    default: "Lina — запоминайте надолго",
    template: "%s — Lina",
  },
  description: DEFAULT_DESCRIPTION,
  category: "education",
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Lina",
    title: "Lina — запоминайте надолго",
    description: DEFAULT_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lina — запоминайте надолго",
    description: DEFAULT_DESCRIPTION,
    images: [SOCIAL_IMAGE.url],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ViewTransition
          default="app-route"
          enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "app-route" }}
          exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "app-route" }}
        >
          {children}
        </ViewTransition>
      </body>
    </html>
  );
}
