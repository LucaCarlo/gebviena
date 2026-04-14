import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const country = searchParams.get("country");
  const productId = searchParams.get("productId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = lang !== DEFAULT_LANG;

  const where: Record<string, unknown> = { isActive: true };
  if (type && type !== "TUTTI") where.type = type;
  if (country) where.country = country;
  if (productId) where.products = { some: { productId } };

  const [rawData, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        _count: { select: { products: true } },
        products: { select: { productId: true } },
        ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.project.count({ where }),
  ]);

  const data = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawData as any[]).map((p) => mergeFirstTranslation(p, TRANSLATABLE_FIELDS.project))
    : rawData;

  return NextResponse.json({
    success: true,
    data,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit },
  });
}

export async function POST(req: Request) {
  const permResult = await requirePermission("projects", "create");
  if (isErrorResponse(permResult)) return permResult;

  try {
    const body = await req.json();
    const { productIds, ...projectData } = body;

    const data = await prisma.project.create({ data: projectData });

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      await prisma.projectProduct.createMany({
        data: productIds.map((productId: string) => ({
          projectId: data.id,
          productId,
        })),
        skipDuplicates: true,
      });
    }

    const result = await prisma.project.findUnique({
      where: { id: data.id },
      include: {
        products: { include: { product: true } },
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
