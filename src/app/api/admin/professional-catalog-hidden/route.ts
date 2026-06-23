import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** GET /api/admin/professional-catalog-hidden?productId=X | ?projectId=X
 *  Ritorna la lista degli URL immagine "del catalogo" nascosti dall'area pro. */
export async function GET(req: NextRequest) {
  const auth = await requirePermission("products", "view");
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const projectId = searchParams.get("projectId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (productId) where.productId = productId;
  if (projectId) where.projectId = projectId;

  const rows = await prisma.professionalCatalogHidden.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ success: true, data: rows });
}

/** POST — nasconde un'immagine catalogo (URL) per un product/project. */
export async function POST(req: Request) {
  const auth = await requirePermission("products", "edit");
  if (isErrorResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const productId = body.productId || null;
  const projectId = body.projectId || null;
  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";

  if (!productId && !projectId) {
    return NextResponse.json({ success: false, error: "productId o projectId richiesto" }, { status: 400 });
  }
  if (!fileUrl) {
    return NextResponse.json({ success: false, error: "fileUrl richiesto" }, { status: 400 });
  }

  // Evita duplicati (productId + fileUrl o projectId + fileUrl)
  const existing = await prisma.professionalCatalogHidden.findFirst({
    where: { productId, projectId, fileUrl },
  });
  if (existing) {
    return NextResponse.json({ success: true, data: existing });
  }

  const rec = await prisma.professionalCatalogHidden.create({
    data: { productId, projectId, fileUrl: fileUrl.slice(0, 500) },
  });
  return NextResponse.json({ success: true, data: rec }, { status: 201 });
}
