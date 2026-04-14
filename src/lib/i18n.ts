import { headers } from "next/headers";
import { prisma } from "./prisma";
import { getDefaultString } from "./ui-strings";

export const DEFAULT_LANG = "it";

/**
 * Returns the active language code (it/en/de/fr/...) for the current request.
 * Reads from the `x-gtv-lang` header set by middleware.
 * Safe to call from server components / route handlers.
 */
export function getCurrentLang(): string {
  try {
    const h = headers();
    return h.get("x-gtv-lang") || DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/**
 * Per-request cache of UI overrides for the active language.
 * We load all overrides once per request to avoid N queries.
 */
const overridesCache = new Map<string, Map<string, string>>();
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

async function loadOverrides(lang: string): Promise<Map<string, string>> {
  const now = Date.now();
  if (now - cacheTimestamp > CACHE_TTL_MS) {
    overridesCache.clear();
    cacheTimestamp = now;
  }
  const cached = overridesCache.get(lang);
  if (cached) return cached;
  const rows = await prisma.uiTranslationOverride.findMany({ where: { languageCode: lang } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  overridesCache.set(lang, map);
  return map;
}

/**
 * Translate a UI string key.
 * Order: DB override for current lang → default IT string → key itself.
 */
export async function t(key: string): Promise<string> {
  const lang = getCurrentLang();
  if (lang === DEFAULT_LANG) return getDefaultString(key);
  const overrides = await loadOverrides(lang);
  return overrides.get(key) ?? getDefaultString(key);
}

/**
 * Synchronous batch translate — useful in server components that need many keys at once.
 * Caller must await loadAllOverrides first if needed.
 */
export async function tBatch(keys: string[]): Promise<Record<string, string>> {
  const lang = getCurrentLang();
  if (lang === DEFAULT_LANG) {
    const out: Record<string, string> = {};
    for (const k of keys) out[k] = getDefaultString(k);
    return out;
  }
  const overrides = await loadOverrides(lang);
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = overrides.get(k) ?? getDefaultString(k);
  return out;
}

/**
 * Loads all translations for a given language at once.
 * Useful to pass to client components via props.
 */
export async function loadAllUiTranslations(lang?: string): Promise<Record<string, string>> {
  const code = lang || getCurrentLang();
  if (code === DEFAULT_LANG) return {};
  const overrides = await loadOverrides(code);
  return Object.fromEntries(overrides);
}

/**
 * Resolve the translated value for a single entity field (server-side).
 * Returns translatedValue || defaultItalianValue.
 */
export async function tEntityField(
  delegate: string,
  parentField: string,
  entityId: string,
  field: string,
  defaultValue: string
): Promise<string> {
  const lang = getCurrentLang();
  if (lang === DEFAULT_LANG) return defaultValue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (prisma as unknown as Record<string, any>)[delegate];
  if (!d) return defaultValue;
  const row = await d.findUnique({ where: { [`${parentField}_languageCode`]: { [parentField]: entityId, languageCode: lang } } });
  const v = row?.[field];
  return typeof v === "string" && v.trim() ? v : defaultValue;
}
