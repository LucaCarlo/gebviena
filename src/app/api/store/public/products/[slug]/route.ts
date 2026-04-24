import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/store/public/products/:slug?lang=it
 * Lookup via StoreProductTranslation.slug (in quella lingua)
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const lang = req.nextUrl.searchParams.get("lang") || "it";

  // Cerca translation con slug corrispondente
  const translation = await prisma.storeProductTranslation.findFirst({
    where: { slug: params.slug, languageCode: lang },
  });

  // Fallback: cerca in qualunque lingua
  const storeProductId = translation?.storeProductId
    || (await prisma.storeProductTranslation.findFirst({ where: { slug: params.slug } }))?.storeProductId;

  if (!storeProductId) {
    return NextResponse.json({ success: false, error: "Prodotto non trovato" }, { status: 404 });
  }

  const sp = await prisma.storeProduct.findUnique({
    where: { id: storeProductId },
    select: {
      id: true,
      isPublished: true,
      coverImage: true,
      galleryImages: true,
      excludedCatalogImages: true,
      storeCategory: { select: { id: true, slug: true, translations: { select: { languageCode: true, name: true, slug: true } } } },
      product: {
        select: {
          id: true, name: true, slug: true, category: true, coverImage: true, imageUrl: true, galleryImages: true,
          designer: { select: { name: true, slug: true } },
          translations: { select: { languageCode: true, name: true, description: true } },
        },
      },
      translations: true,
      variants: {
        where: { isPublished: true },
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        select: {
          id: true, sku: true, priceCents: true, stockQty: true, trackStock: true,
          volumeM3: true, weightKg: true, shippingClass: true,
          coverImage: true, galleryImages: true, isDefault: true,
          attributes: {
            select: {
              valueId: true,
              value: {
                select: {
                  id: true, type: true, code: true, hexColor: true,
                  translations: { select: { languageCode: true, label: true } },
                },
              },
            },
          },
          translations: { select: { languageCode: true, name: true, description: true } },
        },
      },
    },
  });

  if (!sp || !sp.isPublished) {
    return NextResponse.json({ success: false, error: "Prodotto non trovato" }, { status: 404 });
  }

  const tr = sp.translations.find((t) => t.languageCode === lang) || sp.translations.find((t) => t.languageCode === "it");
  const productTr = sp.product.translations.find((t) => t.languageCode === lang);

  return NextResponse.json({
    success: true,
    data: {
      id: sp.id,
      slug: tr?.slug || sp.product.slug,
      name: tr?.name || productTr?.name || sp.product.name,
      shortDescription: tr?.shortDescription || null,
      marketingDescription: tr?.marketingDescription || productTr?.description || null,
      seoTitle: tr?.seoTitle || null,
      seoDescription: tr?.seoDescription || null,
      coverImage: sp.coverImage || sp.product.coverImage || sp.product.imageUrl,
      galleryImages: sp.galleryImages,
      excludedCatalogImages: sp.excludedCatalogImages,
      catalogGalleryImages: sp.product.galleryImages, // da filtrare nel client con excluded
      category: sp.storeCategory
        ? {
            id: sp.storeCategory.id,
            slug: sp.storeCategory.slug,
            name: sp.storeCategory.translations.find((t) => t.languageCode === lang)?.name
              || sp.storeCategory.translations.find((t) => t.languageCode === "it")?.name
              || sp.storeCategory.slug,
          }
        : null,
      designer: sp.product.designer,
      variants: sp.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        priceCents: v.priceCents,
        stockQty: v.stockQty,
        trackStock: v.trackStock,
        volumeM3: Number(v.volumeM3),
        weightKg: v.weightKg !== null ? Number(v.weightKg) : null,
        shippingClass: v.shippingClass,
        coverImage: v.coverImage,
        galleryImages: v.galleryImages,
        isDefault: v.isDefault,
        name: v.translations.find((t: { languageCode: string }) => t.languageCode === lang)?.name ?? null,
        description: v.translations.find((t: { languageCode: string }) => t.languageCode === lang)?.description ?? null,
        attributes: v.attributes.map((a) => {
          const trans = a.value.translations as { languageCode: string; label: string }[];
          return {
            id: a.value.id,
            type: a.value.type,
            code: a.value.code,
            hexColor: a.value.hexColor,
            label: trans.find((t) => t.languageCode === lang)?.label
              || trans.find((t) => t.languageCode === "it")?.label
              || a.value.code,
          };
        }),
      })),
    },
  });
}
