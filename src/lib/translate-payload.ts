/**
 * Helpers to merge translation rows onto entity payloads, with fallback
 * to the default Italian fields.
 *
 * Used by public API routes and server components to deliver the active
 * language version of an entity without breaking the existing response shape.
 */

export function applyTranslation<T extends Record<string, unknown>>(
  entity: T | null | undefined,
  translation: Record<string, unknown> | null | undefined,
  fields: readonly string[]
): T | null | undefined {
  if (!entity) return entity;
  if (!translation) return entity;
  const out: Record<string, unknown> = { ...entity };
  for (const f of fields) {
    const v = translation[f];
    if (typeof v === "string") {
      if (v.trim() !== "") out[f] = v;
    } else if (v !== undefined && v !== null) {
      out[f] = v;
    }
  }
  return out as T;
}

/** Given an entity that has `translations: [...]` attached (filtered by lang), merge the first one. */
export function mergeFirstTranslation<T extends Record<string, unknown>>(
  entity: (T & { translations?: Record<string, unknown>[] }) | null | undefined,
  fields: readonly string[]
): T | null | undefined {
  if (!entity) return entity;
  const t = entity.translations && entity.translations[0];
  const merged = applyTranslation(entity, t, fields);
  if (!merged) return merged;
  // strip translations array from output
  const { translations: _t, ...rest } = merged as T & { translations?: unknown };
  void _t;
  return rest as T;
}

export const TRANSLATABLE_FIELDS = {
  product: ["name", "slug", "description", "materials", "dimensions", "variants", "seoTitle", "seoDescription", "seoKeywords"] as const,
  designer: ["name", "slug", "bio", "country", "seoTitle", "seoDescription", "seoKeywords"] as const,
  project: ["name", "slug", "city", "architect", "description", "shortDescription", "seoTitle", "seoDescription", "seoKeywords"] as const,
  campaign: ["name", "slug", "subtitle", "description", "seoTitle", "seoDescription", "seoKeywords"] as const,
  news: ["title", "slug", "subtitle", "excerpt", "content", "blocks", "seoTitle", "seoDescription", "seoKeywords"] as const,
  catalog: ["name", "slug", "pretitle", "title", "description", "linkText"] as const,
  hero: ["title", "subtitle", "ctaText", "ctaLink"] as const,
  award: ["name", "description", "seoTitle", "seoDescription", "seoKeywords"] as const,
  category: ["label"] as const,
  typology: ["label"] as const,
  subcategory: ["label"] as const,
};

/**
 * Resolve the active lang for a request.
 * Checks query param `lang` first, then x-gtv-lang header, then default.
 */
export function resolveLangFromRequest(req: Request, defaultLang = "it"): string {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("lang");
    if (q) return q;
  } catch { /* ignore */ }
  const h = req.headers.get("x-gtv-lang");
  return h || defaultLang;
}
