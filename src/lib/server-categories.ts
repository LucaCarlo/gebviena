import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LANG } from "@/lib/i18n";
import { buildLabelLookup } from "@/lib/category-lookup";

/**
 * Server-side helper: returns a robust slug→translatedLabel lookup map for a
 * given contentType, including the category itself, its subcategories AND the
 * matching typologies (since Product.category sometimes stores typology slugs
 * like "CLASSICI"). Uses x-gtv-lang from the middleware-set request header.
 */
export async function getCategoryLabelMap(contentType: string): Promise<Map<string, string>> {
  const lang = headers().get("x-gtv-lang") || DEFAULT_LANG;
  const includeTranslations = lang !== DEFAULT_LANG;
  const [cats, typos] = await Promise.all([
    prisma.contentCategory.findMany({
      where: { contentType },
      include: {
        subcategories: includeTranslations
          ? { include: { translations: { where: { languageCode: lang } } } }
          : true,
        ...(includeTranslations ? { translations: { where: { languageCode: lang } } } : {}),
      },
    }),
    prisma.contentTypology.findMany({
      where: { contentType },
      ...(includeTranslations ? { include: { translations: { where: { languageCode: lang } } } } : {}),
    }),
  ]);
  const items: { value: string; label: string }[] = [];
  for (const c of cats) {
    const tr = includeTranslations ? (c as { translations?: { label: string }[] }).translations?.[0] : null;
    items.push({ value: c.value, label: tr?.label?.trim() || c.label });
    for (const s of c.subcategories || []) {
      const sTr = includeTranslations ? (s as { translations?: { label: string }[] }).translations?.[0] : null;
      items.push({ value: s.value, label: sTr?.label?.trim() || s.label });
    }
  }
  for (const tp of typos) {
    const tr = includeTranslations ? (tp as { translations?: { label: string }[] }).translations?.[0] : null;
    items.push({ value: tp.value, label: tr?.label?.trim() || tp.label });
  }
  return buildLabelLookup(items);
}

/** Backwards-compatible alias: subcategories are merged into getCategoryLabelMap. */
export async function getSubcategoryLabelMap(contentType: string): Promise<Map<string, string>> {
  return getCategoryLabelMap(contentType);
}
