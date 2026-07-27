import type { Metadata } from "next";
import { GuestLanding } from "@/components/home-client";
import { StructuredData } from "@/components/structured-data";
import { DEFAULT_DESCRIPTION, marketingMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata({
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

export default function Home() {
  return (
    <>
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Lina",
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: "ru",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "RUB",
          availability: "https://schema.org/InStock",
        },
      }} />
      <GuestLanding />
    </>
  );
}
