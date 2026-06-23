import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** DELETE — rimuove il record di nascondimento (ripristina l'immagine catalogo). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("products", "edit");
  if (isErrorResponse(auth)) return auth;
  const { id } = await params;
  await prisma.professionalCatalogHidden.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ success: true });
}
