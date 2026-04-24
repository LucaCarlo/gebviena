import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

type TranslationInput = {
  languageCode: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  isPublished?: boolean;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_categories", "view");
  if (isErrorResponse(result)) return result;

  const cat = await prisma.storeCategory.findUnique({
    where: { id: params.id },
    include: { translations: true, _count: { select: { products: true, children: true } } },
  });
  if (!cat) return NextResponse.json({ success: false, error: "Non trovata" }, { status: 404 });
  return NextResponse.json({ success: true, data: cat });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_categories", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const slug = body.slug !== undefined ? String(body.slug).trim() : undefined;
    const parentId = body.parentId !== undefined ? (body.parentId || null) : undefined;
    const coverImage = body.coverImage !== undefined ? (body.coverImage ? String(body.coverImage) : null) : undefined;
    const sortOrder = Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder) : undefined;
    const isPublished = typeof body.isPublished === "boolean" ? body.isPublished : undefined;
    const translations: TranslationInput[] | undefined = Array.isArray(body.translations) ? body.translations : undefined;

    if (parentId === params.id) {
      return NextResponse.json({ success: false, error: "Una categoria non può essere figlia di se stessa" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.storeCategory.update({
        where: { id: params.id },
        data: { slug, parentId, coverImage, sortOrder, isPublished },
      });

      if (translations) {
        await tx.storeCategoryTranslation.deleteMany({ where: { categoryId: params.id } });
        const clean = translations
          .filter((t) => t.languageCode && t.name)
          .map((t) => ({
            categoryId: params.id,
            languageCode: String(t.languageCode),
            name: String(t.name).trim(),
            slug: String(t.slug).trim(),
            description: t.description ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoKeywords: t.seoKeywords ?? null,
            isPublished: t.isPublished === true,
          }));
        if (clean.length) await tx.storeCategoryTranslation.createMany({ data: clean });
      }

      return tx.storeCategory.findUnique({
        where: { id: params.id },
        include: { translations: true, _count: { select: { products: true, children: true } } },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Slug già in uso" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_categories", "delete");
  if (isErrorResponse(result)) return result;

  try {
    const cat = await prisma.storeCategory.findUnique({
      where: { id: params.id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!cat) return NextResponse.json({ success: false, error: "Non trovata" }, { status: 404 });

    if (cat._count.children > 0) {
      return NextResponse.json(
        { success: false, error: `Ha ${cat._count.children} sotto-categorie: rimuovile o spostale prima` },
        { status: 409 }
      );
    }
    if (cat._count.products > 0) {
      return NextResponse.json(
        { success: false, error: `Ci sono ${cat._count.products} prodotti in questa categoria: spostali prima` },
        { status: 409 }
      );
    }

    await prisma.storeCategory.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
