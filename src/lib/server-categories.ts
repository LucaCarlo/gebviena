import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LANG } from "@/lib/i18n";

/**
 * Server-side helper: Map<categoryValue, translatedLabel> for a given contentType.
 * Reads the active lang from the x-gtv-lang request header set by middleware.
 */
export async function getCategoryLabelMap(contentType: string): Promise<Map<string, string>> {
  const lang = headers().get("x-gtv-lang") || DEFAULT_LANG;
  const includeTranslations = lang !== DEFAULT_LANG;
  const cats = await prisma.contentCategory.findMany({
    where: { contentType },
    ...(includeTranslations ? { include: { translations: { where: { languageCode: lang } } } } : {}),
  });
  const m = new Map<string, string>();
  for (const c of cats) {
    const tr = includeTranslations ? (c as { translations?: { label: string }[] }).translations?.[0] : null;
    const label = tr?.label?.trim() || c.label;
    m.set(c.value, label);
  }
  return m;
}

export async function getSubcategoryLabelMap(contentType: string): Promise<Map<string, string>> {
  const lang = headers().get("x-gtv-lang") || DEFAULT_LANG;
  const includeTranslations = lang !== DEFAULT_LANG;
  const cats = await prisma.contentCategory.findMany({
    where: { contentType },
    include: {
      subcategories: includeTranslations
        ? { include: { translations: { where: { languageCode: lang } } } }
        : true,
    },
  });
  const m = new Map<string, string>();
  for (const c of cats) {
    for (const s of c.subcategories || []) {
      const tr = includeTranslations ? (s as { translations?: { label: string }[] }).translations?.[0] : null;
      const label = tr?.label?.trim() || s.label;
      m.set(s.value, label);
    }
  }
  return m;
}
