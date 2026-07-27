import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guide-content";
import { SITE_URL } from "@/lib/seo";

const PUBLIC_PATHS = [
  "/",
  "/how-it-works",
  "/features",
  "/features/card-import",
  "/features/spaced-repetition",
  "/features/telegram-reminders",
  "/science",
  "/for-school",
  "/for-students",
  "/for-language-learning",
  "/for-exams",
  "/guides",
  "/about",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-27T00:00:00.000Z");
  const guidePaths = GUIDES.map(({ slug }) => `/guides/${slug}`);

  return [...PUBLIC_PATHS, ...guidePaths].map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified,
    changeFrequency: path.startsWith("/guides/") ? "monthly" : "weekly",
    priority: path === "/" ? 1 : path === "/features" || path === "/how-it-works" ? 0.8 : 0.7,
  }));
}
