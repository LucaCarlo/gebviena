import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get("contentType");
  const typologyId = searchParams.get("typologyId");
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = lang !== DEFAULT_LANG;

  if (!contentType) {
    return NextResponse.json(
      { success: false, error: "contentType is required" },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = { contentType };

  if (typologyId) {
    where.typologies = {
      some: { typologyId },
    };
  }

  const rawData = await prisma.contentCategory.findMany({
    where,
    include: {
      typologies: {
        include: {
          typology: includeTranslations
            ? { include: { translations: { where: { languageCode: lang } } } }
            : true,
        },
      },
      subcategories: {
        orderBy: { sortOrder: "asc" },
        ...(includeTranslations ? { include: { translations: { where: { languageCode: lang } } } } : {}),
      },
      ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });

  const data = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawData as any[]).map((cat) => {
        const merged = mergeFirstTranslation(cat, TRANSLATABLE_FIELDS.category);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typos = ((merged as any)?.typologies || []).map((link: any) => ({
          ...link,
          typology: mergeFirstTranslation(link.typology, TRANSLATABLE_FIELDS.typology),
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subs = ((merged as any)?.subcategories || []).map((s: any) =>
          mergeFirstTranslation(s, TRANSLATABLE_FIELDS.subcategory)
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (merged) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (merged as any).typologies = typos;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (merged as any).subcategories = subs;
        }
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
    const { contentType, value, label, sortOrder, isActive, typologyIds } = body;

    if (!contentType || !value || !label) {
      return NextResponse.json(
        { success: false, error: "contentType, value and label are required" },
        { status: 400 }
      );
    }

    const data = await prisma.contentCategory.create({
      data: {
        contentType,
        value,
        label,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
        ...(typologyIds && typologyIds.length > 0
          ? {
              typologies: {
                create: typologyIds.map((typologyId: string) => ({
                  typologyId,
                })),
              },
            }
          : {}),
      },
      include: {
        typologies: {
          include: {
            typology: true,
          },
        },
        subcategories: {
          orderBy: { sortOrder: "asc" },
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
