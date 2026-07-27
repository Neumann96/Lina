import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lina — интервальное повторение",
    short_name: "Lina",
    description: "Учебные карточки, активное воспроизведение и повторения по расписанию.",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f36f3d",
    lang: "ru",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
