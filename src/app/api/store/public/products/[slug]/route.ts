import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoreGeneralConfig } from "@/lib/stripe-config";
import { marketFromLang, resolveVariantPrice } from "@/lib/store-pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      galleryProductId: true,
      storeCategory: { select: { id: true, slug: true, translations: { select: { languageCode: true, name: true, slug: true } } } },
      product: {
        select: {
          id: true, name: true, slug: true, category: true, coverImage: true, imageUrl: true, galleryImages: true,
          materials: true, dimensions: true,
          designer: {
            select: {
              name: true, slug: true, bio: true, country: true, imageUrl: true,
              translations: { select: { languageCode: true, name: true, bio: true } },
            },
          },
          translations: { select: { languageCode: true, name: true, description: true, materials: true, dimensions: true } },
        },
      },
      translations: true,
      variants: {
        where: { isPublished: true },
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        select: {
          id: true, sku: true, priceCents: true, salePriceCents: true,
          priceFrCents: true, salePriceFrCents: true,
          stockQty: true, trackStock: true,
          volumeM3: true, weightKg: true, shippingClass: true,
          coverImage: true, galleryImages: true, isDefault: true,
          dimensionBlockId: true, dimensionValues: true,
          attributes: {
            select: {
              valueId: true,
              value: {
                select: {
                  id: true, type: true, code: true, hexColor: true, imageUrl: true,
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
  const designer = sp.product.designer;
  const designerTr = designer?.translations.find((t: { languageCode: string }) => t.languageCode === lang);

  // Related projects (where this product was used)
  const projectLinks = await prisma.projectProduct.findMany({
    where: { productId: sp.product.id },
    select: {
      project: {
        select: {
          id: true, name: true, slug: true, type: true, country: true, city: true, year: true, imageUrl: true,
          translations: { select: { languageCode: true, name: true, slug: true, description: true } },
        },
      },
    },
    take: 12,
  });
  const relatedProjects = projectLinks.map((pl) => {
    const ptr = pl.project.translations.find((t: { languageCode: string }) => t.languageCode === lang);
    return {
      id: pl.project.id,
      name: ptr?.name || pl.project.name,
      slug: ptr?.slug || pl.project.slug,
      type: pl.project.type,
      country: pl.project.country,
      city: pl.project.city,
      year: pl.project.year,
      imageUrl: pl.project.imageUrl,
    };
  });

  // Carica i DimensionBlock necessari per le varianti (labels JSON)
  const blockIds = Array.from(new Set(sp.variants.map((v) => v.dimensionBlockId).filter((x): x is string => !!x)));
  const blocks = blockIds.length
    ? await prisma.dimensionBlock.findMany({ where: { id: { in: blockIds } } })
    : [];
  const blockMap = new Map(blocks.map((b) => [b.id, b]));

  // Tempi di consegna globali (admin setting)
  const generalCfg = await getStoreGeneralConfig();

  // Gallery "catalogo" per lo slideshow in fondo: di default dal Product
  // collegato; se l'admin ha impostato un override (galleryProductId) usa
  // la gallery di quel Product (caso "prodotto associato sbagliato").
  let catalogGalleryImages = sp.product.galleryImages;
  if (sp.galleryProductId && sp.galleryProductId !== sp.product.id) {
    const gp = await prisma.product.findUnique({
      where: { id: sp.galleryProductId },
      select: { galleryImages: true },
    });
    if (gp) catalogGalleryImages = gp.galleryImages;
  }

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
      deliveryLeadTime: lang === "fr" ? generalCfg.deliveryLeadTimeFr : generalCfg.deliveryLeadTime,
      coverImage: sp.coverImage || sp.product.coverImage || sp.product.imageUrl,
      galleryImages: sp.galleryImages,
      excludedCatalogImages: sp.excludedCatalogImages,
      catalogGalleryImages, // override-aware; filtrata nel client con excluded
      category: sp.storeCategory
        ? {
            id: sp.storeCategory.id,
            slug: sp.storeCategory.slug,
            name: sp.storeCategory.translations.find((t) => t.languageCode === lang)?.name
              || sp.storeCategory.translations.find((t) => t.languageCode === "it")?.name
              || sp.storeCategory.slug,
          }
        : null,
      materials: productTr?.materials || sp.product.materials || null,
      dimensions: productTr?.dimensions || sp.product.dimensions || null,
      designer: designer
        ? {
            name: designerTr?.name || designer.name,
            slug: designer.slug,
            bio: designerTr?.bio || designer.bio || null,
            country: designer.country || null,
            imageUrl: designer.imageUrl || null,
          }
        : null,
      relatedProjects,
      variants: sp.variants.map((v) => {
        const market = marketFromLang(lang);
        const resolved = resolveVariantPrice(v, market);
        return {
        id: v.id,
        sku: v.sku,
        // Prezzi raw (entrambi i mercati) — utili al client per debug / switch lingua
        priceCents: v.priceCents,
        salePriceCents: v.salePriceCents,
        priceFrCents: v.priceFrCents,
        salePriceFrCents: v.salePriceFrCents,
        // Prezzi risolti per il MERCATO corrente (quelli da mostrare nel frontend):
        marketBasePriceCents: resolved.basePriceCents,
        marketSalePriceCents: resolved.salePriceCents,
        marketEffectivePriceCents: resolved.effectivePriceCents,
        market,
        stockQty: v.stockQty,
        trackStock: v.trackStock,
        volumeM3: Number(v.volumeM3),
        weightKg: v.weightKg !== null ? Number(v.weightKg) : null,
        shippingClass: v.shippingClass,
        coverImage: v.coverImage,
        galleryImages: v.galleryImages,
        isDefault: v.isDefault,
        dimensions: (() => {
          if (!v.dimensionBlockId) return null;
          const block = blockMap.get(v.dimensionBlockId);
          if (!block) return null;
          let labels: string[] = [];
          try { const p = JSON.parse(block.labels); if (Array.isArray(p)) labels = p.filter((x): x is string => typeof x === "string"); } catch { /* ignore */ }
          let values: Record<string, string> = {};
          if (v.dimensionValues) {
            try { const p = JSON.parse(v.dimensionValues); if (p && typeof p === "object") values = p as Record<string, string>; } catch { /* ignore */ }
          }
          return { blockName: block.name, labels, values };
        })(),
        name: v.translations.find((t: { languageCode: string }) => t.languageCode === lang)?.name ?? null,
        description: v.translations.find((t: { languageCode: string }) => t.languageCode === lang)?.description ?? null,
        attributes: v.attributes.map((a) => {
          const trans = a.value.translations as { languageCode: string; label: string }[];
          return {
            id: a.value.id,
            type: a.value.type,
            code: a.value.code,
            hexColor: a.value.hexColor,
            imageUrl: a.value.imageUrl,
            label: trans.find((t) => t.languageCode === lang)?.label
              || trans.find((t) => t.languageCode === "it")?.label
              || a.value.code,
          };
        }),
      };
    }),
    },
  });
}
