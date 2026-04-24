import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/store/public/products
 * Query: lang, category=<slug> | categoryId, attrs=ID1,ID2, q, minPrice, maxPrice,
 *        onlyAvailable=1, sort=newest|price-asc|price-desc|name|top-sold|top-favorited
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get("lang") || "it";
  const categorySlug = sp.get("category");
  const categoryId = sp.get("categoryId");
  const attrs = (sp.get("attrs") || "").split(",").filter(Boolean);
  const q = (sp.get("q") || "").trim();
  const minPrice = Number(sp.get("minPrice")) || 0;
  const maxPrice = Number(sp.get("maxPrice")) || 0;
  const onlyAvailable = sp.get("onlyAvailable") === "1";
  const sort = sp.get("sort") || "newest";

  const variantsFilter: Prisma.StoreProductVariantWhereInput = { isPublished: true };
  if (attrs.length > 0) variantsFilter.attributes = { some: { valueId: { in: attrs } } };
  if (minPrice > 0) variantsFilter.priceCents = { ...(variantsFilter.priceCents as object || {}), gte: Math.round(minPrice * 100) };
  if (maxPrice > 0) variantsFilter.priceCents = { ...(variantsFilter.priceCents as object || {}), lte: Math.round(maxPrice * 100) };
  if (onlyAvailable) {
    // Solo varianti con stock > 0 oppure che non tracciano lo stock
    variantsFilter.OR = [
      { trackStock: false },
      { trackStock: true, stockQty: { gt: 0 } },
    ];
  }

  const where: Prisma.StoreProductWhereInput = {
    isPublished: true,
    variants: { some: variantsFilter },
  };
  if (categorySlug) {
    where.storeCategory = { slug: categorySlug };
  } else if (categoryId) {
    where.storeCategoryId = categoryId;
  }
  if (q) {
    where.OR = [
      { product: { name: { contains: q } } },
      { translations: { some: { languageCode: lang, name: { contains: q } } } },
      { translations: { some: { languageCode: lang, shortDescription: { contains: q } } } },
    ];
  }

  let orderBy: Prisma.StoreProductOrderByWithRelationInput[] = [{ sortOrder: "asc" }, { publishedAt: "desc" }];
  if (sort === "name") orderBy = [{ product: { name: "asc" } }];

  const products = await prisma.storeProduct.findMany({
    where,
    orderBy,
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
        where: { isPublished: true },
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

    // Hover image: prima immagine della gallery dello store, fallback cover di un'altra variante
    let hoverImage: string | null = null;
    try {
      const gallery = p.galleryImages ? (JSON.parse(p.galleryImages) as string[]) : [];
      if (Array.isArray(gallery) && gallery.length > 0) hoverImage = gallery[0];
    } catch { /* ignore */ }
    if (!hoverImage) {
      const altVariant = p.variants.find((v) => v.coverImage && v.coverImage !== p.coverImage);
      if (altVariant?.coverImage) hoverImage = altVariant.coverImage;
    }

    // Color swatches: valori distinti di tipo COLOR tra le varianti (con hex + label)
    const colorsMap = new Map<string, { code: string; hex: string | null }>();
    for (const v of p.variants) {
      for (const attr of v.attributes) {
        if (attr.value.type === "COLOR" && !colorsMap.has(attr.value.id)) {
          colorsMap.set(attr.value.id, { code: attr.value.code, hex: attr.value.hexColor });
        }
      }
    }
    const colors = Array.from(colorsMap.entries()).map(([id, v]) => ({ id, code: v.code, hex: v.hex }));

    return {
      id: p.id,
      slug: tr?.slug || p.product.slug,
      name: tr?.name || p.product.name,
      shortDescription: tr?.shortDescription || null,
      coverImage: p.coverImage || p.product.coverImage || p.product.imageUrl,
      hoverImage,
      colors,
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

  let sorted = data;
  if (sort === "price-asc") {
    sorted = [...data].sort((a, b) => a.priceFromCents - b.priceFromCents);
  } else if (sort === "price-desc") {
    sorted = [...data].sort((a, b) => b.priceFromCents - a.priceFromCents);
  }

  return NextResponse.json({ success: true, data: sorted });
}
