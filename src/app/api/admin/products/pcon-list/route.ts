import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products/pcon-list
 * Lista prodotti ATTIVI con configurazione pCon (pconBan valorizzato).
 * Usata dal select "Prodotto di apertura" nella tab pCon configuratore.
 */
export async function GET() {
  const auth = await requirePermission("newsletter", "view");
  if (isErrorResponse(auth)) return auth;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      pconBan: { not: null },
    },
    select: { id: true, name: true, slug: true, pconBan: true },
    orderBy: { name: "asc" },
  });
  // Filtra fuori i record con pconBan vuoto (NULL filtrato sopra, ma "" può esistere)
  const data = products
    .filter((p) => p.pconBan && p.pconBan.trim().length > 0)
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug }));
  return NextResponse.json({ success: true, data });
}
