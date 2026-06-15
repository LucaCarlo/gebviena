import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET() {
  const result = await requirePermission("catalogs", "view");
  if (isErrorResponse(result)) return result;
  const data = await prisma.fabricFinishCategory.findMany({
    include: { files: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const result = await requirePermission("catalogs", "edit");
  if (isErrorResponse(result)) return result;
  const body = await req.json();
  const name = String(body.name || "").trim();
  const slug = String(body.slug || "").trim();
  if (!name || !slug) {
    return NextResponse.json({ success: false, error: "name e slug obbligatori" }, { status: 400 });
  }
  try {
    const data = await prisma.fabricFinishCategory.create({
      data: {
        name,
        slug,
        description: body.description ? String(body.description) : null,
        sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
        isPublished: body.isPublished !== false,
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("unique")) {
      return NextResponse.json({ success: false, error: "Slug gia esistente" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
