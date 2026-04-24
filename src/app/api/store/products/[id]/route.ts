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
    const isPublished = typeof body.isPublished === "boolean" ? body.isPublished : undefined;
    const sortOrder = Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder) : undefined;
    const translations: TranslationInput[] | undefined = Array.isArray(body.translations) ? body.translations : undefined;

    const data: Record<string, unknown> = {};
    if (storeCategoryId !== undefined) data.storeCategoryId = storeCategoryId;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (galleryImages !== undefined) data.galleryImages = galleryImages;
    if (isPublished !== undefined) {
      data.isPublished = isPublished;
      if (isPublished) data.publishedAt = new Date();
    }
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.storeProduct.update({ where: { id: params.id }, data });

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
          product: true,
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
