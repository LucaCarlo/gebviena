import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

/**
 * Duplica uno StoreProduct (+ Product + variants + translations + attributi).
 *
 * - Crea un nuovo Product collegato (necessario perché Product.storeProduct è 1:1)
 *   con slug univoco (suffisso -copy-XXXX).
 * - Crea un nuovo StoreProduct con stesso coverImage/galleryImages/category/ecc.
 * - Duplica le translations con slug univoco.
 * - Duplica TUTTE le varianti: SKU originale + suffisso -DUP-XXXX (4 char random),
 *   isPublished=false (parte come bozza), copia attributi e translations.
 *
 * Risposta: { newStoreProductId } per redirect.
 */
function rand(len = 4): string {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789"; // niente O/0/1/I confondibili
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function uniqueSku(base: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}-DUP-${rand(4)}`.slice(0, 64);
    const exists = await prisma.storeProductVariant.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base.slice(0, 50)}-${Date.now().toString(36).toUpperCase()}`.slice(0, 64);
}

async function uniqueSlug(base: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}-copy-${rand(4).toLowerCase()}`.slice(0, 80);
    const exists = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base.slice(0, 60)}-${Date.now().toString(36)}`;
}

async function uniqueTranslationSlug(languageCode: string, base: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}-copy-${rand(4).toLowerCase()}`.slice(0, 80);
    const exists = await prisma.storeProductTranslation.findFirst({
      where: { languageCode, slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${base.slice(0, 60)}-${Date.now().toString(36)}`;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_products", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const sp = await prisma.storeProduct.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        translations: true,
        variants: {
          include: {
            attributes: true,
            translations: true,
          },
        },
      },
    });
    if (!sp) {
      return NextResponse.json({ success: false, error: "Prodotto non trovato" }, { status: 404 });
    }

    const newId = await prisma.$transaction(async (tx) => {
      // 1) Duplica Product (con slug univoco).
      //    Manteniamo lo stesso nome catalogo — il rinomina è in admin.
      //    (In passato suffissavamo " (copia)" ricorsivamente, producendo
      //    "(copia) (copia) (copia)" su doppie/triple duplicazioni.)
      const newProductSlug = await uniqueSlug(sp.product.slug);
      const newProduct = await tx.product.create({
        data: {
          name: sp.product.name,
          slug: newProductSlug,
          designerId: sp.product.designerId,
          designerName: sp.product.designerName,
          category: sp.product.category,
          subcategory: sp.product.subcategory,
          description: sp.product.description,
          materials: sp.product.materials,
          dimensions: sp.product.dimensions,
          dimensionBlockId: sp.product.dimensionBlockId,
          dimensionValues: sp.product.dimensionValues,
          coverImage: sp.product.coverImage,
          heroImage: sp.product.heroImage,
          sideImage: sp.product.sideImage,
          galleryImages: sp.product.galleryImages,
          galleryOrientations: sp.product.galleryOrientations,
          variants: sp.product.variants,
          dimensionImage: sp.product.dimensionImage,
          techSheetUrl: sp.product.techSheetUrl,
          model2dUrl: sp.product.model2dUrl,
          model3dUrl: sp.product.model3dUrl,
          pconUrl: sp.product.pconUrl,
          pconMoc: sp.product.pconMoc,
          pconBan: sp.product.pconBan,
          pconSid: sp.product.pconSid,
          pconOvc: sp.product.pconOvc,
          year: sp.product.year,
          imageUrl: sp.product.imageUrl,
          isFeatured: false,
          isNew: true,
          isActive: sp.product.isActive,
          // Copia generata per lo store: non deve comparire nel catalogo/ricerca
          // del sito principale (resta usabile dallo store via StoreProduct).
          excludeFromCatalog: true,
        },
      });

      // 2) Duplica StoreProduct (bozza)
      const newSp = await tx.storeProduct.create({
        data: {
          productId: newProduct.id,
          storeCategoryId: sp.storeCategoryId,
          coverImage: sp.coverImage,
          galleryImages: sp.galleryImages,
          excludedCatalogImages: sp.excludedCatalogImages,
          isPublished: false,
          publishedAt: null,
          sortOrder: sp.sortOrder,
          productsPerBox: sp.productsPerBox,
        },
      });

      // 3) Duplica translations (con slug univoco per (languageCode, slug))
      for (const tr of sp.translations) {
        const newSlug = await uniqueTranslationSlug(tr.languageCode, tr.slug);
        await tx.storeProductTranslation.create({
          data: {
            storeProductId: newSp.id,
            languageCode: tr.languageCode,
            name: tr.name,
            slug: newSlug,
            shortDescription: tr.shortDescription,
            marketingDescription: tr.marketingDescription,
            seoTitle: tr.seoTitle,
            seoDescription: tr.seoDescription,
            seoKeywords: tr.seoKeywords,
            status: "draft",
            isPublished: false,
          },
        });
      }

      // 4) Duplica varianti con nuovi SKU random
      for (const v of sp.variants) {
        const newSku = await uniqueSku(v.sku);
        const newV = await tx.storeProductVariant.create({
          data: {
            storeProductId: newSp.id,
            sku: newSku,
            listPriceCents: v.listPriceCents,
            priceCents: v.priceCents,
            salePriceCents: v.salePriceCents,
            priceFrCents: v.priceFrCents,
            salePriceFrCents: v.salePriceFrCents,
            priceWithVatCents: v.priceWithVatCents,
            stockQty: v.stockQty,
            trackStock: v.trackStock,
            volumeM3: v.volumeM3,
            weightKg: v.weightKg,
            shippingClass: v.shippingClass,
            coverImage: v.coverImage,
            galleryImages: v.galleryImages,
            isDefault: v.isDefault,
            isPublished: false,
            sortOrder: v.sortOrder,
            dimensionBlockId: v.dimensionBlockId,
            dimensionValues: v.dimensionValues,
          },
        });
        // Variant translations
        for (const vt of v.translations) {
          await tx.storeProductVariantTranslation.create({
            data: {
              variantId: newV.id,
              languageCode: vt.languageCode,
              name: vt.name,
              description: vt.description,
            },
          });
        }
        // Variant attributes
        for (const a of v.attributes) {
          await tx.storeProductVariantAttribute.create({
            data: { variantId: newV.id, valueId: a.valueId },
          });
        }
      }

      return newSp.id;
    });

    return NextResponse.json({ success: true, data: { newStoreProductId: newId } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[duplicate] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
