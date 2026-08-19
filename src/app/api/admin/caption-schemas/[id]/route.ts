import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// GET    /api/admin/caption-schemas/[id]
// PUT    /api/admin/caption-schemas/[id]  → aggiorna label/parts/sortOrder/isActive
// DELETE /api/admin/caption-schemas/[id]  → rimuove (cascade su translations)

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission("settings", "view");
  if (isErrorResponse(auth)) return auth;
  const row = await prisma.productCaptionType.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  return NextResponse.json({ success: true, data: row });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission("settings", "edit");
  if (isErrorResponse(auth)) return auth;
  try {
    const body = await req.json();
    const { key, label, partsJson, sortOrder, isActive } = body;
    const data = await prisma.productCaptionType.update({
      where: { id: params.id },
      data: {
        ...(key !== undefined && { key: String(key).toUpperCase().replace(/\s+/g, "_") }),
        ...(label !== undefined && { label }),
        ...(partsJson !== undefined && { partsJson }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission("settings", "edit");
  if (isErrorResponse(auth)) return auth;
  try {
    await prisma.productCaptionType.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
