import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/store/public/products
 * Query: lang=it|en|de|fr, categoryId, attrs=ID1,ID2 (OR di attributi), q
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get("lang") || "it";
  const categoryId = sp.get("categoryId");
  const attrs = (sp.get("attrs") || "").split(",").filter(Boolean);
  const q = (sp.get("q") || "").trim();

  const where: Prisma.StoreProductWhereInput = {
    isPublished: true,
    variants: { some: { isPublished: true, priceCents: { gt: 0 } } },
  };
  if (categoryId) where.storeCategoryId = categoryId;
  if (q) {
    where.OR = [
      { product: { name: { contains: q } } },
      { translations: { some: { languageCode: lang, name: { contains: q } } } },
      { translations: { some: { languageCode: lang, shortDescription: { contains: q } } } },
    ];
  }
  if (attrs.length > 0) {
    // Un prodotto matcha se almeno 1 variante ha TUTTI gli attrs richiesti?
    // Semplificato: OR tra attributi (match se qualunque variante ha 1 degli attrs).
    where.variants = {
      some: {
        isPublished: true,
        priceCents: { gt: 0 },
        attributes: { some: { valueId: { in: attrs } } },
      },
    };
  }

  const products = await prisma.storeProduct.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    take: 200,
    select: {
      id: true,
      coverImage: true,
      galleryImages: true,
      sortOrder: true,
      storeCategory: {
        select: { id: true, slug: true, translations: { select: { languageCode: true, name: true, slug: true } } },
      },
      product: {
        select: { id: true, name: true, slug: true, coverImage: true, imageUrl: true },
      },
      translations: {
        select: {
          languageCode: true, name: true, slug: true, shortDescription: true,
        },
      },
      variants: {
        where: { isPublished: true, priceCents: { gt: 0 } },
        select: {
          id: true, sku: true, priceCents: true, stockQty: true, trackStock: true,
          isDefault: true, coverImage: true,
          attributes: { select: { valueId: true, value: { select: { id: true, type: true, code: true, hexColor: true } } } },
        },
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
      },
    },
  });

  // Proiezione in una struttura comoda per il frontend
  const data = products.map((p) => {
    const tr = p.translations.find((t) => t.languageCode === lang) || p.translations.find((t) => t.languageCode === "it");
    const minPrice = p.variants.reduce((m, v) => Math.min(m, v.priceCents), Infinity);
    const hasStock = p.variants.some((v) => !v.trackStock || (v.stockQty ?? 0) > 0);
    return {
      id: p.id,
      slug: tr?.slug || p.product.slug,
      name: tr?.name || p.product.name,
      shortDescription: tr?.shortDescription || null,
      coverImage: p.coverImage || p.product.coverImage || p.product.imageUrl,
      priceFromCents: isFinite(minPrice) ? minPrice : 0,
      variantsCount: p.variants.length,
      inStock: hasStock,
      category: p.storeCategory
        ? {
            slug: p.storeCategory.slug,
            name: p.storeCategory.translations.find((t) => t.languageCode === lang)?.name
              || p.storeCategory.translations.find((t) => t.languageCode === "it")?.name
              || p.storeCategory.slug,
          }
        : null,
    };
  });

  return NextResponse.json({ success: true, data });
}
