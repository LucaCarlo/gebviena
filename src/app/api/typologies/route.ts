import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get("contentType");
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = lang !== DEFAULT_LANG;

  const where: Record<string, unknown> = {};
  if (contentType) where.contentType = contentType;

  const rawData = await prisma.contentTypology.findMany({
    where,
    include: {
      categories: {
        include: {
          category: includeTranslations
            ? { include: { translations: { where: { languageCode: lang } } } }
            : true,
        },
      },
      ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });

  const data = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawData as any[]).map((typo) => {
        const merged = mergeFirstTranslation(typo, TRANSLATABLE_FIELDS.typology);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cats = ((merged as any)?.categories || []).map((link: any) => ({
          ...link,
          category: mergeFirstTranslation(link.category, TRANSLATABLE_FIELDS.category),
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (merged) (merged as any).categories = cats;
        return merged;
      })
    : rawData;

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Non autorizzato" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { contentType, value, label, sortOrder, isActive, imageUrl } = body;

    if (!contentType || !value || !label) {
      return NextResponse.json(
        { success: false, error: "contentType, value and label are required" },
        { status: 400 }
      );
    }

    const data = await prisma.contentTypology.create({
      data: {
        contentType,
        value,
        label,
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 400 }
    );
  }
}
