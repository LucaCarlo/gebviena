import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ success: false, error: "Slug richiesto" }, { status: 400 });
  }
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = lang !== DEFAULT_LANG;

  // Resolve productId: try translation slug first (if non-default lang), fallback to default slug
  let productId: string | null = null;
  if (includeTranslations) {
    const tr = await prisma.productTranslation.findFirst({
      where: { languageCode: lang, slug },
      select: { productId: true },
    });
    productId = tr?.productId ?? null;
  }

  const raw = productId
    ? await prisma.product.findUnique({
        where: { id: productId },
        include: {
          designer: includeTranslations
            ? { include: { translations: { where: { languageCode: lang } } } }
            : true,
          ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
        },
      })
    : await prisma.product.findUnique({
        where: { slug },
        include: {
          designer: includeTranslations
            ? { include: { translations: { where: { languageCode: lang } } } }
            : true,
          ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
        },
      });

  if (!raw) {
    return NextResponse.json({ success: false, error: "Prodotto non trovato" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = raw;
  if (includeTranslations) {
    data = mergeFirstTranslation(raw, TRANSLATABLE_FIELDS.product);
    if (data?.designer) {
      data.designer = mergeFirstTranslation(data.designer, TRANSLATABLE_FIELDS.designer);
    }
  }

  // Fetch related products (same primary typology, excluding current)
  const primaryTypology = data.category?.split(",")[0] || data.category;
  const relatedRaw = await prisma.product.findMany({
    where: { category: { contains: primaryTypology }, id: { not: data.id }, isActive: true },
    take: 4,
    include: {
      designer: includeTranslations
        ? { include: { translations: { where: { languageCode: lang } } } }
        : true,
      ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
    },
  });
  const related = includeTranslations
    ? relatedRaw.map((p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m: any = mergeFirstTranslation(p, TRANSLATABLE_FIELDS.product);
        if (m?.designer) m.designer = mergeFirstTranslation(m.designer, TRANSLATABLE_FIELDS.designer);
        return m;
      })
    : relatedRaw;

  // Fetch projects that actually use this product
  const projectLinks = await prisma.projectProduct.findMany({
    where: { productId: data.id },
    include: {
      project: includeTranslations
        ? { include: { translations: { where: { languageCode: lang } } } }
        : true,
    },
    take: 4,
  });
  const projects = projectLinks
    .map((pp) => pp.project)
    .filter((p) => p.isActive)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p) => (includeTranslations ? mergeFirstTranslation(p as any, TRANSLATABLE_FIELDS.project) : p));

  return NextResponse.json({
    success: true,
    data: { ...data, related, projects },
  });
}
