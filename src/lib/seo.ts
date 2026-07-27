import type { Metadata } from "next";

export const SITE_NAME = "Lina";
export const SITE_URL = "https://lina-lern.ru";
export const SOCIAL_IMAGE = {
  url: "/og.png",
  width: 1730,
  height: 909,
  alt: "Lina — запоминайте надолго",
};
export const DEFAULT_DESCRIPTION =
  "Lina помогает школьникам и студентам создавать карточки, вспоминать материал и повторять его по персональному расписанию.";

type MarketingMetadataOptions = {
  title?: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

export function marketingMetadata({
  title,
  description,
  path,
  noIndex = false,
}: MarketingMetadataOptions): Metadata {
  const url = new URL(path, SITE_URL).toString();
  const fullTitle = title ? `${title} — Lina` : "Lina — запоминайте надолго";

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: SITE_NAME,
      url,
      title: fullTitle,
      description,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}

export function privatePageMetadata(title: string): Metadata {
  return {
    title: `${title} — Lina`,
    robots: { index: false, follow: false, nocache: true },
  };
}
