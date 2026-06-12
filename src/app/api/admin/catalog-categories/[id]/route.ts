import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/catalog-categories/:id
 * Aggiorna una categoria. Body: { slug?, label?, sortOrder?, isActive?, showInPublic? }
 * NOTA: cambiando slug, i Catalog esistenti restano legati al vecchio slug → l'admin
 * deve rinominare anche la colonna section dei cataloghi (lo facciamo qui in transazione).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("catalogs", "edit");
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  try {
    const body = await req.json();
    const current = await prisma.catalogCategory.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: "Non trovata" }, { status: 404 });

    const nextSlug = body.slug != null ? String(body.slug).trim() : current.slug;
    if (!nextSlug) return NextResponse.json({ success: false, error: "slug non valido" }, { status: 400 });

    if (nextSlug !== current.slug) {
      // verifica unicità nuovo slug
      const collision = await prisma.catalogCategory.findUnique({ where: { slug: nextSlug } });
      if (collision) return NextResponse.json({ success: false, error: "Slug già usato" }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cat = await tx.catalogCategory.update({
        where: { id },
        data: {
          slug: nextSlug,
          label: body.label != null ? String(body.label) : current.label,
          sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : current.sortOrder,
          isActive: body.isActive != null ? !!body.isActive : current.isActive,
          showInPublic: body.showInPublic != null ? !!body.showInPublic : current.showInPublic,
        },
      });
      if (nextSlug !== current.slug) {
        await tx.catalog.updateMany({
          where: { section: current.slug },
          data: { section: nextSlug },
        });
      }
      return cat;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/catalog-categories/:id
 * Rifiuta se esistono Catalog con quel section. L'admin deve prima spostarli.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("catalogs", "delete");
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const current = await prisma.catalogCategory.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ success: false, error: "Non trovata" }, { status: 404 });

  const used = await prisma.catalog.count({ where: { section: current.slug } });
  if (used > 0) {
    return NextResponse.json({
      success: false,
      error: `Impossibile eliminare: ${used} catalog${used === 1 ? "o" : "hi"} usa${used === 1 ? "" : "no"} questa categoria. Spostali prima in un'altra categoria.`,
    }, { status: 409 });
  }

  await prisma.catalogCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
