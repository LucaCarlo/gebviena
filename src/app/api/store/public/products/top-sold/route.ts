import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/store/public/products/top-sold
 * Restituisce i prodotti più venduti (somma quantità OrderItem con ordini non
 * annullati/rimborsati), mappati su StoreProduct. Usato per il mega-menu.
 * Query: lang=it|en|de|fr, limit=8
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get("lang") || "it";
  const limit = Math.min(20, Math.max(1, parseInt(sp.get("limit") || "8", 10)));

  const grouped = await prisma.orderItem.groupBy({
    by: ["variantId"],
    where: {
      variantId: { not: null },
      order: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit * 4,
  });

  const variantIds = grouped.map((g) => g.variantId!).filter(Boolean);
  const variants = variantIds.length
    ? await prisma.storeProductVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, storeProductId: true },
      })
    : [];

  const qtyByProduct = new Map<string, number>();
  for (const g of grouped) {
    const v = variants.find((x) => x.id === g.variantId);
    if (!v) continue;
    qtyByProduct.set(
      v.storeProductId,
      (qtyByProduct.get(v.storeProductId) || 0) + (g._sum.quantity || 0),
    );
  }

  const topIds = Array.from(qtyByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const select = {
    id: true,
    coverImage: true,
    product: { select: { name: true, coverImage: true, imageUrl: true } },
    translations: { where: { languageCode: lang }, select: { name: true, slug: true } },
    variants: {
      where: { isPublished: true },
      select: { priceCents: true },
      orderBy: { priceCents: "asc" as const },
      take: 1,
    },
  };

  if (topIds.length === 0) {
    const fallback = await prisma.storeProduct.findMany({
      where: { isPublished: true, variants: { some: { isPublished: true } } },
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      select,
    });
    return NextResponse.json({ success: true, data: fallback.map(project) });
  }

  const products = await prisma.storeProduct.findMany({
    where: { id: { in: topIds }, isPublished: true },
    select,
  });
  const map = new Map(products.map((p) => [p.id, p]));
  const ordered = topIds.map((id) => map.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  return NextResponse.json({ success: true, data: ordered.map(project) });
}

type FetchedProduct = {
  id: string;
  coverImage: string | null;
  product: { name: string; coverImage: string | null; imageUrl: string | null };
  translations: { name: string | null; slug: string }[];
  variants: { priceCents: number }[];
};

function project(p: FetchedProduct) {
  const tr = p.translations[0];
  return {
    id: p.id,
    slug: tr?.slug || "",
    name: tr?.name || p.product.name,
    coverImage: p.coverImage || p.product.coverImage || p.product.imageUrl,
    priceFromCents: p.variants[0]?.priceCents ?? 0,
  };
}
