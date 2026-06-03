import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/professionals/:id — toggle isActive (e nient'altro per ora). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data: { isActive?: boolean } = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Nessun campo aggiornabile" }, { status: 400 });
    }
    const updated = await prisma.professional.update({
      where: { id: params.id },
      data,
      select: { id: true, isActive: true },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("newsletter", "edit");
  if (isErrorResponse(result)) return result;
  try {
    await prisma.professional.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
