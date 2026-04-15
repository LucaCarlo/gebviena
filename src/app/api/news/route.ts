import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const admin = searchParams.get("admin") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "16");
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = !admin && lang !== DEFAULT_LANG;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (!admin) where.isActive = true;
  if (category && category !== "TUTTI") where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { subtitle: { contains: search } },
    ];
  }

  const [rawData, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      ...(includeTranslations
        ? { include: { translations: { where: { languageCode: lang } } } }
        : {}),
      skip: (page - 1) * limit,
      take: limit,
      orderBy: admin ? { updatedAt: "desc" } : { sortOrder: "asc" },
    }),
    prisma.newsArticle.count({ where }),
  ]);

  const data = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawData as any[]).map((p) => mergeFirstTranslation(p, TRANSLATABLE_FIELDS.news))
    : rawData;

  return NextResponse.json({
    success: true,
    data,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit },
  });
}

export async function POST(req: Request) {
  const result = await requirePermission("news", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data = await prisma.newsArticle.create({ data: body });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
