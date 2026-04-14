import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const featured = searchParams.get("featured");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);

  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== "TUTTI") where.category = { contains: category };
  if (subcategory) where.subcategory = subcategory;
  if (featured === "true") where.isFeatured = true;

  const includeTranslations = lang !== DEFAULT_LANG;

  const [rawData, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        designer: includeTranslations
          ? { include: { translations: { where: { languageCode: lang } } } }
          : true,
        ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  const data = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawData as any[]).map((p) => {
        const merged = mergeFirstTranslation(p, TRANSLATABLE_FIELDS.product);
        if (merged && (merged as { designer?: unknown }).designer) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (merged as any).designer = mergeFirstTranslation((merged as any).designer, TRANSLATABLE_FIELDS.designer);
        }
        return merged;
      })
    : rawData;

  return NextResponse.json({
    success: true,
    data,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit },
  });
}

export async function POST(req: Request) {
  const result = await requirePermission("products", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    delete body.designer;

    const data = await prisma.product.create({ data: body });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
