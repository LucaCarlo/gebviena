import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const result = await requirePermission("store_products", "view");
  if (isErrorResponse(result)) return result;

  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const publishedParam = req.nextUrl.searchParams.get("published");
  const search = (req.nextUrl.searchParams.get("q") || "").trim();

  const where: Prisma.StoreProductWhereInput = {};
  if (categoryId) where.storeCategoryId = categoryId;
  if (publishedParam === "true") where.isPublished = true;
  if (publishedParam === "false") where.isPublished = false;
  if (search) {
    where.product = {
      OR: [
        { name: { contains: search } },
        { slug: { contains: search } },
      ],
    };
  }

  const items = await prisma.storeProduct.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, slug: true, category: true, imageUrl: true, coverImage: true, isActive: true } },
      storeCategory: { select: { id: true, slug: true, translations: { select: { languageCode: true, name: true } } } },
      variants: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        select: { id: true, sku: true, priceCents: true, stockQty: true, isDefault: true, isPublished: true, volumeM3: true },
      },
      _count: { select: { variants: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(req: NextRequest) {
  const result = await requirePermission("store_products", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const productId = String(body.productId || "").trim();
    if (!productId) {
      return NextResponse.json({ success: false, error: "productId obbligatorio" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ success: false, error: "Prodotto catalogo non trovato" }, { status: 404 });

    const storeCategoryId = body.storeCategoryId || null;
    const coverImage = body.coverImage ? String(body.coverImage) : null;
    const sortOrder = Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder) : 0;

    const created = await prisma.storeProduct.create({
      data: {
        productId,
        storeCategoryId,
        coverImage,
        sortOrder,
        isPublished: false,
        variants: {
          create: {
            sku: `${product.slug.slice(0, 55)}-default`,
            priceCents: 0,
            isDefault: true,
            isPublished: false,
            volumeM3: 0,
          },
        },
      },
      include: {
        product: { select: { id: true, name: true, slug: true, category: true } },
        variants: true,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Esiste già uno StoreProduct per questo Product" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
