import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentLang, DEFAULT_LANG } from "@/lib/i18n";
import { buildAlternates } from "@/lib/seo-alternates";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const lang = getCurrentLang();
  let articleId: string | null = null;

  if (lang !== DEFAULT_LANG) {
    const tr = await prisma.newsArticleTranslation.findFirst({
      where: { languageCode: lang, slug: params.slug },
      select: { newsArticleId: true },
    });
    if (tr) articleId = tr.newsArticleId;
  }
  if (!articleId) {
    const a = await prisma.newsArticle.findUnique({ where: { slug: params.slug }, select: { id: true } });
    articleId = a?.id ?? null;
  }
  if (!articleId) return { title: "Articolo non trovato" };

  const raw = await prisma.newsArticle.findUnique({
    where: { id: articleId },
    select: {
      title: true, slug: true, seoTitle: true, seoDescription: true, imageUrl: true,
      translations: { select: { languageCode: true, slug: true, title: true, seoTitle: true, seoDescription: true } },
    },
  });
  if (!raw) return { title: "Articolo non trovato" };

  const tForLang = raw.translations.find((t) => t.languageCode === lang);
  const seoTitle = tForLang?.seoTitle?.trim() || raw.seoTitle?.trim() || `${tForLang?.title || raw.title} | GTV`;
  const seoDescription = tForLang?.seoDescription?.trim() || raw.seoDescription?.trim() || undefined;
  const slugByLang: Record<string, string> = { [DEFAULT_LANG]: raw.slug };
  for (const t of raw.translations) if (t.slug) slugByLang[t.languageCode] = t.slug;
  const alternates = await buildAlternates(`/news-e-rassegna-stampa/${raw.slug}`, slugByLang);
  return {
    title: seoTitle, description: seoDescription, alternates,
    openGraph: { title: seoTitle, description: seoDescription, images: raw.imageUrl ? [raw.imageUrl] : undefined },
  };
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
