import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = lang !== DEFAULT_LANG;

  const where: Record<string, unknown> = { isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { country: { contains: search } },
    ];
  }

  const rawData = await prisma.designer.findMany({
    where,
    ...(includeTranslations
      ? { include: { translations: { where: { languageCode: lang } } } }
      : {}),
    orderBy: { sortOrder: "asc" },
  });

  const data = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawData as any[]).map((d) => mergeFirstTranslation(d, TRANSLATABLE_FIELDS.designer))
    : rawData;

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const result = await requirePermission("designers", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data = await prisma.designer.create({ data: body });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
