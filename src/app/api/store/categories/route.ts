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

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(_req: NextRequest) {
  const result = await requirePermission("store_categories", "view");
  if (isErrorResponse(result)) return result;

  const categories = await prisma.storeCategory.findMany({
    include: { translations: true, _count: { select: { products: true, children: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ success: true, data: categories });
}

export async function POST(req: NextRequest) {
  const result = await requirePermission("store_categories", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const slug = String(body.slug || "").trim() || slugify(String(body.translations?.[0]?.name || ""));
    const parentId = body.parentId || null;
    const coverImage = body.coverImage ? String(body.coverImage) : null;
    const sortOrder = Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder) : 0;
    const isPublished = body.isPublished === true;
    const translations: TranslationInput[] = Array.isArray(body.translations) ? body.translations : [];

    if (!slug) {
      return NextResponse.json({ success: false, error: "Slug obbligatorio" }, { status: 400 });
    }

    const created = await prisma.storeCategory.create({
      data: {
        slug,
        parentId,
        coverImage,
        sortOrder,
        isPublished,
        translations: translations.length
          ? {
              create: translations
                .filter((t) => t.languageCode && t.name)
                .map((t) => ({
                  languageCode: String(t.languageCode),
                  name: String(t.name).trim(),
                  slug: String(t.slug || slugify(t.name)).trim(),
                  description: t.description ?? null,
                  seoTitle: t.seoTitle ?? null,
                  seoDescription: t.seoDescription ?? null,
                  seoKeywords: t.seoKeywords ?? null,
                  isPublished: t.isPublished === true,
                })),
            }
          : undefined,
      },
      include: { translations: true, _count: { select: { products: true, children: true } } },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Slug già in uso" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
