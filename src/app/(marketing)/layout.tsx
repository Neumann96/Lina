import { StructuredData } from "@/components/structured-data";
import { SITE_URL } from "@/lib/seo";
import "./marketing.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StructuredData data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: "Lina",
            url: SITE_URL,
            logo: `${SITE_URL}/icon.svg`,
            sameAs: ["https://t.me/linalernbot"],
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: "Lina",
            url: SITE_URL,
            inLanguage: "ru",
            publisher: { "@id": `${SITE_URL}/#organization` },
          },
        ],
      }} />
      {children}
    </>
  );
}
