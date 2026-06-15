import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

type TranslationInput = {
  languageCode: string;
  name?: string | null;
  slug: string;
  shortDescription?: string | null;
  marketingDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  isPublished?: boolean;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_products", "view");
  if (isErrorResponse(result)) return result;

  const sp = await prisma.storeProduct.findUnique({
    where: { id: params.id },
    include: {
      product: {
        include: {
          translations: true,
          designer: { select: { id: true, name: true, slug: true } },
        },
      },
      storeCategory: { include: { translations: true } },
      translations: true,
      variants: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        include: {
          attributes: { include: { value: { include: { translations: true } } } },
          translations: true,
        },
      },
    },
  });
  if (!sp) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  return NextResponse.json({ success: true, data: sp });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_products", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const storeCategoryId = body.storeCategoryId !== undefined ? (body.storeCategoryId || null) : undefined;
    const coverImage = body.coverImage !== undefined ? (body.coverImage ? String(body.coverImage) : null) : undefined;
    const galleryImages = body.galleryImages !== undefined ? (body.galleryImages ? String(body.galleryImages) : null) : undefined;
    const excludedCatalogImages = body.excludedCatalogImages !== undefined ? (body.excludedCatalogImages ? String(body.excludedCatalogImages) : null) : undefined;
    const galleryProductId = body.galleryProductId !== undefined ? (body.galleryProductId ? String(body.galleryProductId) : null) : undefined;
    const isPublished = typeof body.isPublished === "boolean" ? body.isPublished : undefined;
    const sortOrder = Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder) : undefined;
    const productsPerBox = Number.isFinite(body.productsPerBox) ? Math.max(1, Math.trunc(body.productsPerBox)) : undefined;
    const translations: TranslationInput[] | undefined = Array.isArray(body.translations) ? body.translations : undefined;
    // productName: rinomina diretta del Product catalogo (sorgente per header
    // admin + storefront fallback). Allinea anche la translation IT del
    // StoreProduct così override mostrato al cliente è coerente.
    const productName: string | undefined = typeof body.productName === "string" && body.productName.trim().length > 0
      ? body.productName.trim().slice(0, 255)
      : undefined;

    const data: Record<string, unknown> = {};
    if (storeCategoryId !== undefined) data.storeCategoryId = storeCategoryId;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (galleryImages !== undefined) data.galleryImages = galleryImages;
    if (excludedCatalogImages !== undefined) data.excludedCatalogImages = excludedCatalogImages;
    if (galleryProductId !== undefined) data.galleryProductId = galleryProductId;
    if (isPublished !== undefined) {
      data.isPublished = isPublished;
      if (isPublished) data.publishedAt = new Date();
    }
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (productsPerBox !== undefined) data.productsPerBox = productsPerBox;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.storeProduct.update({ where: { id: params.id }, data });

      if (productName) {
        const sp = await tx.storeProduct.findUnique({ where: { id: params.id }, select: { productId: true } });
        if (sp) {
          await tx.product.update({ where: { id: sp.productId }, data: { name: productName } });
          // Allinea anche la translation IT (override storefront)
          const itTr = await tx.storeProductTranslation.findFirst({
            where: { storeProductId: params.id, languageCode: "it" },
            select: { id: true },
          });
          if (itTr) {
            await tx.storeProductTranslation.update({ where: { id: itTr.id }, data: { name: productName } });
          }
        }
      }

      if (translations) {
        await tx.storeProductTranslation.deleteMany({ where: { storeProductId: params.id } });
        const clean = translations
          .filter((t) => t.languageCode && t.slug)
          .map((t) => ({
            storeProductId: params.id,
            languageCode: String(t.languageCode),
            name: t.name ? String(t.name).trim() : null,
            slug: String(t.slug).trim(),
            shortDescription: t.shortDescription ?? null,
            marketingDescription: t.marketingDescription ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoKeywords: t.seoKeywords ?? null,
            isPublished: t.isPublished === true,
          }));
        if (clean.length) await tx.storeProductTranslation.createMany({ data: clean });
      }

      return tx.storeProduct.findUnique({
        where: { id: params.id },
        include: {
          product: {
            include: {
              translations: true,
              designer: { select: { id: true, name: true, slug: true } },
            },
          },
          storeCategory: { include: { translations: true } },
          translations: true,
          variants: {
            orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
            include: {
              attributes: { include: { value: { include: { translations: true } } } },
              translations: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Slug traduzione in conflitto" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_products", "delete");
  if (isErrorResponse(result)) return result;

  try {
    await prisma.storeProduct.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
