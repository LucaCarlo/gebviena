import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LANG } from "@/lib/i18n";

// GET /api/caption-schemas         → tutti gli schemi (italiano default)
// GET /api/caption-schemas?lang=en → merge traduzione per singola lingua
// GET /api/caption-schemas?id=xxx  → singolo schema

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const langParam = searchParams.get("lang") || DEFAULT_LANG;
  const includeTranslations = langParam !== DEFAULT_LANG;

  if (id) {
    const row = await prisma.productCaptionType.findUnique({
      where: { id },
      include: includeTranslations
        ? { translations: { where: { languageCode: langParam } } }
        : undefined,
    });
    if (!row) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = includeTranslations ? (row as any).translations?.[0] : null;
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        key: row.key,
        label: t?.label || row.label,
        parts: t?.partsJson || row.partsJson,
      },
    });
  }

  const rows = await prisma.productCaptionType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    include: includeTranslations
      ? { translations: { where: { languageCode: langParam } } }
      : undefined,
  });

  const data = rows.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = includeTranslations ? (row as any).translations?.[0] : null;
    return {
      id: row.id,
      key: row.key,
      label: t?.label || row.label,
      parts: t?.partsJson || row.partsJson,
      sortOrder: row.sortOrder,
    };
  });

  return NextResponse.json({ success: true, data });
}
