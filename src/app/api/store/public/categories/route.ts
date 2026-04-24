import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public endpoint: tree of published StoreCategory with productCount
export async function GET() {
  const cats = await prisma.storeCategory.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      parentId: true,
      slug: true,
      coverImage: true,
      sortOrder: true,
      translations: {
        select: { languageCode: true, name: true, slug: true },
      },
    },
  });

  // Conta i prodotti pubblicati (con almeno una variante pubblicata) per categoria
  const grouped = await prisma.storeProduct.groupBy({
    by: ["storeCategoryId"],
    where: {
      isPublished: true,
      variants: { some: { isPublished: true } },
      storeCategoryId: { not: null },
    },
    _count: { _all: true },
  });
  const countMap = new Map<string, number>();
  for (const g of grouped) {
    if (g.storeCategoryId) countMap.set(g.storeCategoryId, g._count._all);
  }

  // Per le root: aggrega anche il count delle figlie
  const childCount = new Map<string, number>(); // parentId -> count accumulato
  for (const c of cats) {
    if (c.parentId) {
      const own = countMap.get(c.id) || 0;
      childCount.set(c.parentId, (childCount.get(c.parentId) || 0) + own);
    }
  }

  const data = cats.map((c) => ({
    ...c,
    productCount: (countMap.get(c.id) || 0) + (childCount.get(c.id) || 0),
  }));

  return NextResponse.json({ success: true, data });
}
