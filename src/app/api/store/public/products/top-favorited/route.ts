import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { marketFromLang, resolveVariantPrice, Market } from "@/lib/store-pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/store/public/products/top-favorited
 * Restituisce i prodotti con più "preferiti" (CustomerFavorite).
 * Query: lang=it|en|de|fr, limit=8
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get("lang") || "it";
  const limit = Math.min(20, Math.max(1, parseInt(sp.get("limit") || "8", 10)));

  const grouped = await prisma.customerFavorite.groupBy({
    by: ["storeProductId"],
    _count: { storeProductId: true },
    orderBy: { _count: { storeProductId: "desc" } },
    take: limit,
  });

  const ids = grouped.map((g) => g.storeProductId);

  const market = marketFromLang(lang);

  if (ids.length === 0) {
    // Fallback: primi N prodotti pubblicati
    const fallback = await prisma.storeProduct.findMany({
      where: { isPublished: true, variants: { some: { isPublished: true } } },
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      select: projSelect(lang),
    });
    return NextResponse.json({ success: true, data: fallback.map((p) => projMap(p, market)) });
  }

  const products = await prisma.storeProduct.findMany({
    where: { id: { in: ids }, isPublished: true },
    select: projSelect(lang),
  });

  const order = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => order.get(id)).filter((p): p is NonNullable<typeof p> => !!p);

  return NextResponse.json({ success: true, data: ordered.map((p) => projMap(p, market)) });
}

function projSelect(lang: string) {
  return {
    id: true,
    coverImage: true,
    product: { select: { name: true, coverImage: true, imageUrl: true } },
    translations: { where: { languageCode: lang }, select: { name: true, slug: true } },
    variants: {
      where: { isPublished: true },
      select: {
        priceCents: true, salePriceCents: true,
        priceFrCents: true, salePriceFrCents: true,
      },
      orderBy: { priceCents: "asc" as const },
      take: 1,
    },
  };
}

type FetchedProduct = {
  id: string;
  coverImage: string | null;
  product: { name: string; coverImage: string | null; imageUrl: string | null };
  translations: { name: string | null; slug: string }[];
  variants: {
    priceCents: number; salePriceCents: number | null;
    priceFrCents: number | null; salePriceFrCents: number | null;
  }[];
};

function projMap(p: FetchedProduct, market: Market) {
  const tr = p.translations[0];
  const v = p.variants[0];
  const resolved = v ? resolveVariantPrice(v, market) : null;
  const salePrice = resolved && resolved.salePriceCents != null && resolved.salePriceCents < resolved.basePriceCents
    ? resolved.salePriceCents
    : null;
  return {
    id: p.id,
    slug: tr?.slug || "",
    name: tr?.name || p.product.name,
    coverImage: p.coverImage || p.product.coverImage || p.product.imageUrl,
    priceFromCents: resolved?.basePriceCents ?? 0,
    salePriceFromCents: salePrice,
  };
}
