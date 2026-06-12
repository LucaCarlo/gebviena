import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog-categories
 * Categorie cataloghi attive, ordinate per sortOrder.
 * Query: ?scope=public per filtrare solo quelle visibili in /professionisti/cataloghi.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  const where: { isActive: boolean; showInPublic?: boolean } = { isActive: true };
  if (scope === "public") where.showInPublic = true;

  const categories = await prisma.catalogCategory.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, slug: true, label: true, labelI18n: true, sortOrder: true, showInPublic: true },
  });
  return NextResponse.json({ success: true, data: categories });
}
