import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const result = await requirePermission("media", "view");
  if (isErrorResponse(result)) return result;

  const rows = await prisma.mediaFileTranslation.findMany({
    where: { mediaFileId: params.id },
    orderBy: { languageCode: "asc" },
  });
  return NextResponse.json({ success: true, data: rows });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const result = await requirePermission("media", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const languageCode = String(body?.languageCode || "").trim();
    const altText = typeof body?.altText === "string" ? body.altText : "";

    if (!languageCode) {
      return NextResponse.json({ success: false, error: "languageCode richiesto" }, { status: 400 });
    }

    const saved = await prisma.mediaFileTranslation.upsert({
      where: { mediaFileId_languageCode: { mediaFileId: params.id, languageCode } },
      update: { altText },
      create: { mediaFileId: params.id, languageCode, altText },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
