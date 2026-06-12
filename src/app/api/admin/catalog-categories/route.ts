import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/catalog-categories
 * Tutte le categorie (anche disattivate) per la gestione admin.
 */
export async function GET() {
  const auth = await requirePermission("catalogs", "view");
  if (isErrorResponse(auth)) return auth;

  const categories = await prisma.catalogCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ success: true, data: categories });
}

/**
 * POST /api/admin/catalog-categories
 * Crea una nuova categoria. Body: { slug?, label, sortOrder?, isActive?, showInPublic? }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission("catalogs", "create");
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await req.json();
    const label = String(body.label || "").trim();
    if (!label) return NextResponse.json({ success: false, error: "label richiesta" }, { status: 400 });
    const slug = (body.slug && String(body.slug).trim()) || slugify(label);

    const exists = await prisma.catalogCategory.findUnique({ where: { slug } });
    if (exists) return NextResponse.json({ success: false, error: "Slug già esistente" }, { status: 409 });

    const created = await prisma.catalogCategory.create({
      data: {
        slug,
        label,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        isActive: body.isActive !== false,
        showInPublic: body.showInPublic !== false,
      },
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
