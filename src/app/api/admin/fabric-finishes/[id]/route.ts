import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("catalogs", "edit");
  if (isErrorResponse(result)) return result;
  const { id } = await params;
  const body = await req.json();
  try {
    const data = await prisma.fabricFinishCategory.update({
      where: { id },
      data: {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        slug: typeof body.slug === "string" ? body.slug.trim() : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("catalogs", "edit");
  if (isErrorResponse(result)) return result;
  const { id } = await params;
  try {
    await prisma.fabricFinishCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
