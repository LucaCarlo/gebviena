import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePermission("catalogs", "edit");
  if (isErrorResponse(result)) return result;
  const { id: categoryId } = await params;
  const body = await req.json();
  const name = String(body.name || "").trim();
  const fileUrl = String(body.fileUrl || "").trim();
  if (!name || !fileUrl) {
    return NextResponse.json({ success: false, error: "name e fileUrl obbligatori" }, { status: 400 });
  }
  try {
    const data = await prisma.fabricFinishFile.create({
      data: {
        categoryId,
        name,
        title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : null,
        fileUrl,
        fileSize: Number.isFinite(body.fileSize) ? Number(body.fileSize) : null,
        mimeType: body.mimeType ? String(body.mimeType) : null,
        sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
        isPublished: body.isPublished !== false,
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
