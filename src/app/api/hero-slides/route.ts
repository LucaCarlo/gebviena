import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page");
  const all = searchParams.get("all"); // admin: return all including inactive
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = !all && lang !== DEFAULT_LANG;

  const where: Record<string, unknown> = {};
  if (page) where.page = page;
  if (!all) where.isActive = true;

  const rawData = await prisma.heroSlide.findMany({
    where,
    ...(includeTranslations
      ? { include: { translations: { where: { languageCode: lang } } } }
      : {}),
    orderBy: { sortOrder: "asc" },
  });

  const data = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawData as any[]).map((h) => mergeFirstTranslation(h, TRANSLATABLE_FIELDS.hero))
    : rawData;

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const result = await requirePermission("hero", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data = await prisma.heroSlide.create({ data: body });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
