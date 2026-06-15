import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * POST — duplica un articolo news (e le sue traduzioni).
 * Il nuovo articolo viene creato come BOZZA: isActive=false, publishedAt=null,
 * slug = slug-copy (+ suffisso numerico se collide), title = title + " (copia)".
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requirePermission("news", "edit");
  if (isErrorResponse(result)) return result;

  const { id } = await params;

  const src = await prisma.newsArticle.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!src) return NextResponse.json({ success: false, error: "Articolo non trovato" }, { status: 404 });

  // Costruisci uno slug unico aggiungendo "-copy" (o "-copy-2", "-copy-3"…).
  const baseSlug = `${src.slug}-copy`;
  let newSlug = baseSlug;
  for (let i = 2; i < 100; i++) {
    const exists = await prisma.newsArticle.findUnique({ where: { slug: newSlug }, select: { id: true } });
    if (!exists) break;
    newSlug = `${baseSlug}-${i}`;
  }

  // Stessa logica per le translation slug (per lingua, unique).
  const used = new Set<string>();
  const translationsData: Array<{
    languageCode: string;
    title: string;
    slug: string;
    subtitle: string | null;
    excerpt: string | null;
    content: string | null;
    blocks: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    status: string;
    isPublished: boolean;
  }> = [];
  for (const tr of src.translations) {
    let slugTr = `${tr.slug}-copy`;
    for (let i = 2; i < 100; i++) {
      if (used.has(`${tr.languageCode}|${slugTr}`)) { slugTr = `${tr.slug}-copy-${i}`; continue; }
      const exists = await prisma.newsArticleTranslation.findUnique({
        where: { languageCode_slug: { languageCode: tr.languageCode, slug: slugTr } },
        select: { id: true },
      }).catch(() => null);
      if (!exists) break;
      slugTr = `${tr.slug}-copy-${i}`;
    }
    used.add(`${tr.languageCode}|${slugTr}`);
    translationsData.push({
      languageCode: tr.languageCode,
      title: `${tr.title} (copia)`,
      slug: slugTr,
      subtitle: tr.subtitle,
      excerpt: tr.excerpt,
      content: tr.content,
      blocks: tr.blocks,
      seoTitle: tr.seoTitle,
      seoDescription: tr.seoDescription,
      seoKeywords: tr.seoKeywords,
      status: "draft",
      isPublished: false,
    });
  }

  const created = await prisma.newsArticle.create({
    data: {
      title: `${src.title} (copia)`,
      slug: newSlug,
      category: src.category,
      subtitle: src.subtitle,
      excerpt: src.excerpt,
      content: src.content,
      imageUrl: src.imageUrl,
      galleryUrls: src.galleryUrls,
      blocks: src.blocks,
      tags: src.tags,
      source: src.source,
      sourceUrl: src.sourceUrl,
      publishedAt: null,
      isActive: false,
      sortOrder: src.sortOrder,
      seoTitle: src.seoTitle,
      seoDescription: src.seoDescription,
      seoKeywords: src.seoKeywords,
      translations: translationsData.length > 0 ? { create: translationsData } : undefined,
    },
    select: { id: true, slug: true, title: true },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
