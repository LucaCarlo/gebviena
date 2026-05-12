import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const result = await requirePermission("catalogs", "edit");
  if (isErrorResponse(result)) return result;
  const { fileId } = await params;
  const body = await req.json();
  try {
    const data = await prisma.fabricFinishFile.update({
      where: { id: fileId },
      data: {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        title: body.title !== undefined ? (typeof body.title === "string" && body.title.trim() ? body.title.trim() : null) : undefined,
        fileUrl: typeof body.fileUrl === "string" ? body.fileUrl.trim() : undefined,
        fileSize: body.fileSize !== undefined ? (Number.isFinite(body.fileSize) ? Number(body.fileSize) : null) : undefined,
        mimeType: body.mimeType !== undefined ? (body.mimeType ? String(body.mimeType) : null) : undefined,
        sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : undefined,
        isPublished: typeof body.isPublished === "boolean" ? body.isPublished : undefined,
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const result = await requirePermission("catalogs", "edit");
  if (isErrorResponse(result)) return result;
  const { fileId } = await params;
  try {
    await prisma.fabricFinishFile.delete({ where: { id: fileId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
