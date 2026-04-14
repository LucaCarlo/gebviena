import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ success: false, error: "Slug richiesto" }, { status: 400 });
  }
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = lang !== DEFAULT_LANG;

  let newsArticleId: string | null = null;
  if (includeTranslations) {
    const tr = await prisma.newsArticleTranslation.findFirst({
      where: { languageCode: lang, slug },
      select: { newsArticleId: true },
    });
    newsArticleId = tr?.newsArticleId ?? null;
  }

  const raw = newsArticleId
    ? await prisma.newsArticle.findUnique({
        where: { id: newsArticleId },
        ...(includeTranslations
          ? { include: { translations: { where: { languageCode: lang } } } }
          : {}),
      })
    : await prisma.newsArticle.findUnique({
        where: { slug },
        ...(includeTranslations
          ? { include: { translations: { where: { languageCode: lang } } } }
          : {}),
      });

  if (!raw) {
    return NextResponse.json({ success: false, error: "Articolo non trovato" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = includeTranslations
    ? mergeFirstTranslation(raw, TRANSLATABLE_FIELDS.news)
    : raw;

  const relatedRaw = await prisma.newsArticle.findMany({
    where: {
      id: { not: data.id },
      isActive: true,
    },
    take: 4,
    orderBy: { publishedAt: "desc" },
    ...(includeTranslations
      ? { include: { translations: { where: { languageCode: lang } } } }
      : {}),
  });
  const related = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (relatedRaw as any[]).map((r) => mergeFirstTranslation(r, TRANSLATABLE_FIELDS.news))
    : relatedRaw;

  return NextResponse.json({ success: true, data: { ...data, related } });
}
