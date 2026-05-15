import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * Lista minimale dei Product del catalogo (id, name, slug, anteprima) —
 * usata dall'admin per scegliere da quale prodotto prendere le immagini
 * dello slideshow "catalogo" (override galleryProductId).
 */
export async function GET() {
  const result = await requirePermission("store_products", "view");
  if (isErrorResponse(result)) return result;

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, coverImage: true, imageUrl: true },
    take: 1000,
  });
  return NextResponse.json({
    success: true,
    data: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      thumb: p.coverImage || p.imageUrl || null,
    })),
  });
}
