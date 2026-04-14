import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, resolveLangFromRequest, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ success: false, error: "Slug richiesto" }, { status: 400 });
  }
  const lang = resolveLangFromRequest(req, DEFAULT_LANG);
  const includeTranslations = lang !== DEFAULT_LANG;

  let projectId: string | null = null;
  if (includeTranslations) {
    const tr = await prisma.projectTranslation.findFirst({
      where: { languageCode: lang, slug },
      select: { projectId: true },
    });
    projectId = tr?.projectId ?? null;
  }

  const productsInclude = {
    include: {
      product: {
        include: {
          designer: includeTranslations
            ? { include: { translations: { where: { languageCode: lang } } } }
            : true,
          ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
        },
      },
    },
  };

  const raw = projectId
    ? await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          products: productsInclude,
          ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
        },
      })
    : await prisma.project.findUnique({
        where: { slug },
        include: {
          products: productsInclude,
          ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
        },
      });

  if (!raw || !raw.isActive) {
    return NextResponse.json({ success: false, error: "Progetto non trovato" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = raw;
  if (includeTranslations) {
    data = mergeFirstTranslation(raw, TRANSLATABLE_FIELDS.project);
    if (Array.isArray(data.products)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.products = data.products.map((pp: any) => {
        const prod = mergeFirstTranslation(pp.product, TRANSLATABLE_FIELDS.product);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (prod && (prod as any).designer) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (prod as any).designer = mergeFirstTranslation((prod as any).designer, TRANSLATABLE_FIELDS.designer);
        }
        return { ...pp, product: prod };
      });
    }
  }

  return NextResponse.json({ success: true, data });
}
