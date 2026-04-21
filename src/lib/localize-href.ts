/**
 * Translates both the path segments AND known filter query params (e.g.
 * `_tipologia`, `_proj_type`, `_proj_country`) into the target language's
 * slugs. Expects the input href in the IT convention (how links are
 * authored in constants.ts and in internal code).
 *
 * Kept in a separate module from `path-segments.ts` because the latter is
 * imported by the Edge middleware and must stay lean; this module brings in
 * the full filter-slugs tables.
 */
import { localizePath, DEFAULT_LANG } from "./path-segments";
import { translateFilterParams } from "./filter-slugs";

export function localizeHref(href: string, lang: string, langPrefix?: string | null): string {
  const [path, qs] = href.split("?");
  const localizedPath = localizePath(path, lang, langPrefix);
  if (!qs) return localizedPath;
  const translated = translateFilterParams(new URLSearchParams(qs), DEFAULT_LANG, lang);
  const out = translated.toString();
  return out ? `${localizedPath}?${out}` : localizedPath;
}
