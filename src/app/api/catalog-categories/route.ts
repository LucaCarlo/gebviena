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

  // Lingua: header x-gtv-lang (set dal middleware), override con ?lang=.
  const qLang = (searchParams.get("lang") || "").toLowerCase();
  const headerLang = (req.headers.get("x-gtv-lang") || "").toLowerCase();
  const lang = qLang || headerLang || "it";

  const categories = await prisma.catalogCategory.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, slug: true, label: true, labelI18n: true, sortOrder: true, showInPublic: true },
  });

  // Risolve label da labelI18n JSON quando presente. labelI18n è una stringa
  // JSON tipo {"en":"Catalogues","fr":"Catalogues","de":"Kataloge","es":"Catálogos"}.
  // Fallback: master `label` (IT). L'admin (che non passa x-gtv-lang qui) vede IT.
  const resolved = categories.map((c) => {
    let label = c.label;
    if (lang !== "it" && c.labelI18n) {
      try {
        const obj = JSON.parse(c.labelI18n) as Record<string, string>;
        const v = obj?.[lang];
        if (typeof v === "string" && v.trim()) label = v.trim();
      } catch { /* ignore parse error: fallback IT */ }
    }
    return { ...c, label };
  });

  return NextResponse.json({ success: true, data: resolved });
}
