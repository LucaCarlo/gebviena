import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

// GET  /api/admin/caption-schemas   → tutte le strutture (auth)
// POST /api/admin/caption-schemas   → crea nuova

export async function GET() {
  const auth = await requirePermission("settings", "view");
  if (isErrorResponse(auth)) return auth;
  const rows = await prisma.productCaptionType.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: Request) {
  const auth = await requirePermission("settings", "edit");
  if (isErrorResponse(auth)) return auth;
  try {
    const body = await req.json();
    const { key, label, partsJson, sortOrder, isActive } = body;
    if (!key || !label) {
      return NextResponse.json({ success: false, error: "key e label obbligatori" }, { status: 400 });
    }
    const data = await prisma.productCaptionType.create({
      data: {
        key: String(key).toUpperCase().replace(/\s+/g, "_"),
        label,
        partsJson: partsJson ?? [],
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
