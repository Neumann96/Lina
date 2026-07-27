import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingPage } from "@/components/marketing/marketing-page";
import { findGuide, GUIDES } from "@/lib/guide-content";
import { marketingMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  return marketingMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
  });
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();

  return <MarketingPage
    path={`/guides/${guide.slug}`}
    eyebrow={guide.eyebrow}
    title={guide.title}
    lead={guide.description}
    sections={guide.sections}
    article
  />;
}
