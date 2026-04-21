/**
 * Bidirectional mapping for URL filter params.
 *
 * Product typologies, project types, news and campaigns categories are driven
 * by the DB — the URL slug is derived from the translated label via
 * `slugify(label)`, cached by `use-filter-slugs.ts`. When an admin renames a
 * taxonomy in the backoffice the URL updates automatically.
 *
 * Country slugs stay hardcoded here: Project.country is free-text Italian and
 * has no translation table in the admin.
 */
import { translateFilterSlug } from "./use-filter-slugs";

export type Lang = "it" | "en" | "de" | "fr" | "es";
export const LANGS: Lang[] = ["it", "en", "de", "fr", "es"];

// ─── COUNTRY (Project.country canonical values — IT names) ────────────────────
export const COUNTRY_SLUGS: Record<string, Record<Lang, string>> = {
  Italia:            { it: "italia",            fr: "italie",               en: "italy",            de: "italien",                      es: "italia" },
  Francia:           { it: "francia",           fr: "france",               en: "france",           de: "frankreich",                   es: "francia" },
  Germania:          { it: "germania",          fr: "allemagne",            en: "germany",          de: "deutschland",                  es: "alemania" },
  Spagna:            { it: "spagna",            fr: "espagne",              en: "spain",            de: "spanien",                      es: "espana" },
  Austria:           { it: "austria",           fr: "autriche",             en: "austria",          de: "osterreich",                   es: "austria" },
  Svizzera:          { it: "svizzera",          fr: "suisse",               en: "switzerland",      de: "schweiz",                      es: "suiza" },
  Belgio:            { it: "belgio",            fr: "belgique",             en: "belgium",          de: "belgien",                      es: "belgica" },
  Olanda:            { it: "olanda",            fr: "pays-bas",             en: "netherlands",      de: "niederlande",                  es: "holanda" },
  Portogallo:        { it: "portogallo",        fr: "portugal",             en: "portugal",         de: "portugal",                     es: "portugal" },
  "Gran Bretagna":   { it: "gran-bretagna",     fr: "royaume-uni",          en: "united-kingdom",   de: "grossbritannien",              es: "reino-unido" },
  Grecia:            { it: "grecia",            fr: "grece",                en: "greece",           de: "griechenland",                 es: "grecia" },
  Svezia:            { it: "svezia",            fr: "suede",                en: "sweden",           de: "schweden",                     es: "suecia" },
  Norvegia:          { it: "norvegia",          fr: "norvege",              en: "norway",           de: "norwegen",                     es: "noruega" },
  Danimarca:         { it: "danimarca",         fr: "danemark",             en: "denmark",          de: "danemark",                     es: "dinamarca" },
  Polonia:           { it: "polonia",           fr: "pologne",              en: "poland",           de: "polen",                        es: "polonia" },
  Ucraina:           { it: "ucraina",           fr: "ukraine",              en: "ukraine",          de: "ukraine",                      es: "ucrania" },
  Russia:            { it: "russia",            fr: "russie",               en: "russia",           de: "russland",                     es: "rusia" },
  Turchia:           { it: "turchia",           fr: "turquie",              en: "turkey",           de: "turkei",                       es: "turquia" },
  "Arabia Saudita":  { it: "arabia-saudita",    fr: "arabie-saoudite",      en: "saudi-arabia",     de: "saudi-arabien",                es: "arabia-saudita" },
  UAE:               { it: "emirati-arabi-uniti", fr: "emirats-arabes-unis", en: "uae",             de: "vereinigte-arabische-emirate", es: "emiratos-arabes-unidos" },
  Singapore:         { it: "singapore",         fr: "singapour",            en: "singapore",        de: "singapur",                     es: "singapur" },
  Filippine:         { it: "filippine",         fr: "philippines",          en: "philippines",      de: "philippinen",                  es: "filipinas" },
  Australia:         { it: "australia",         fr: "australie",            en: "australia",        de: "australien",                   es: "australia" },
  Brasile:           { it: "brasile",           fr: "bresil",               en: "brazil",           de: "brasilien",                    es: "brasil" },
  "Rep. Dominicana": { it: "repubblica-dominicana", fr: "republique-dominicaine", en: "dominican-republic", de: "dominikanische-republik", es: "republica-dominicana" },
};

export const COUNTRY_LABELS: Record<string, Record<Lang, string>> = {
  Italia:            { it: "Italia",              fr: "Italie",                en: "Italy",             de: "Italien",                        es: "Italia" },
  Francia:           { it: "Francia",             fr: "France",                en: "France",            de: "Frankreich",                     es: "Francia" },
  Germania:          { it: "Germania",            fr: "Allemagne",             en: "Germany",           de: "Deutschland",                    es: "Alemania" },
  Spagna:            { it: "Spagna",              fr: "Espagne",               en: "Spain",             de: "Spanien",                        es: "España" },
  Austria:           { it: "Austria",             fr: "Autriche",              en: "Austria",           de: "Österreich",                     es: "Austria" },
  Svizzera:          { it: "Svizzera",            fr: "Suisse",                en: "Switzerland",       de: "Schweiz",                        es: "Suiza" },
  Belgio:            { it: "Belgio",              fr: "Belgique",              en: "Belgium",           de: "Belgien",                        es: "Bélgica" },
  Olanda:            { it: "Olanda",              fr: "Pays-Bas",              en: "Netherlands",       de: "Niederlande",                    es: "Países Bajos" },
  Portogallo:        { it: "Portogallo",          fr: "Portugal",              en: "Portugal",          de: "Portugal",                       es: "Portugal" },
  "Gran Bretagna":   { it: "Gran Bretagna",       fr: "Royaume-Uni",           en: "United Kingdom",    de: "Großbritannien",                 es: "Reino Unido" },
  Grecia:            { it: "Grecia",              fr: "Grèce",                 en: "Greece",            de: "Griechenland",                   es: "Grecia" },
  Svezia:            { it: "Svezia",              fr: "Suède",                 en: "Sweden",            de: "Schweden",                       es: "Suecia" },
  Norvegia:          { it: "Norvegia",            fr: "Norvège",               en: "Norway",            de: "Norwegen",                       es: "Noruega" },
  Danimarca:         { it: "Danimarca",           fr: "Danemark",              en: "Denmark",           de: "Dänemark",                       es: "Dinamarca" },
  Polonia:           { it: "Polonia",             fr: "Pologne",               en: "Poland",            de: "Polen",                          es: "Polonia" },
  Ucraina:           { it: "Ucraina",             fr: "Ukraine",               en: "Ukraine",           de: "Ukraine",                        es: "Ucrania" },
  Russia:            { it: "Russia",              fr: "Russie",                en: "Russia",            de: "Russland",                       es: "Rusia" },
  Turchia:           { it: "Turchia",             fr: "Turquie",               en: "Turkey",            de: "Türkei",                         es: "Turquía" },
  "Arabia Saudita":  { it: "Arabia Saudita",      fr: "Arabie Saoudite",       en: "Saudi Arabia",      de: "Saudi-Arabien",                  es: "Arabia Saudita" },
  UAE:               { it: "Emirati Arabi Uniti", fr: "Émirats Arabes Unis",   en: "UAE",               de: "Vereinigte Arabische Emirate",   es: "Emiratos Árabes Unidos" },
  Singapore:         { it: "Singapore",           fr: "Singapour",             en: "Singapore",         de: "Singapur",                       es: "Singapur" },
  Filippine:         { it: "Filippine",           fr: "Philippines",           en: "Philippines",       de: "Philippinen",                    es: "Filipinas" },
  Australia:         { it: "Australia",           fr: "Australie",             en: "Australia",         de: "Australien",                     es: "Australia" },
  Brasile:           { it: "Brasile",             fr: "Brésil",                en: "Brazil",            de: "Brasilien",                      es: "Brasil" },
  "Rep. Dominicana": { it: "Repubblica Dominicana", fr: "République Dominicaine", en: "Dominican Republic", de: "Dominikanische Republik",   es: "República Dominicana" },
};

export function countryValueToLabel(value: string, lang: string): string {
  if (!isLang(lang)) return value;
  return COUNTRY_LABELS[value]?.[lang] || COUNTRY_LABELS[value]?.it || value;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildReverseMap(map: Record<string, Record<Lang, string>>): Record<Lang, Record<string, string>> {
  const out: Record<string, Record<string, string>> = { it: {}, en: {}, de: {}, fr: {}, es: {} };
  for (const [enumValue, byLang] of Object.entries(map)) {
    for (const [lang, slug] of Object.entries(byLang)) {
      out[lang][slug] = enumValue;
    }
  }
  return out as Record<Lang, Record<string, string>>;
}

const COUNTRY_REVERSE = buildReverseMap(COUNTRY_SLUGS);

function isLang(x: string | undefined | null): x is Lang {
  return !!x && LANGS.includes(x as Lang);
}

export function countrySlugToValue(slug: string, lang: string): string | null {
  if (!isLang(lang)) return null;
  return COUNTRY_REVERSE[lang][slug] || null;
}

export function countryValueToSlug(value: string, lang: string): string | null {
  if (!isLang(lang)) return null;
  return COUNTRY_SLUGS[value]?.[lang] || COUNTRY_SLUGS[value]?.it || null;
}

/**
 * Re-translate all known filter query params between languages. Called by the
 * language switcher so that `/fr/produits?_tipologia=sieges` → `/it/prodotti?
 * _tipologia=sedute`.
 *
 * Dynamic params (_tipologia, _proj_type, _article_type, _campaigns_type)
 * depend on the in-memory cache populated by `use-filter-slugs.ts`. Callers
 * must call `ensureFilterSlugsLoaded()` once before invoking this function
 * (the language switcher does so at mount time).
 *
 * `_proj_country` uses the static mapping above.
 *
 * Unknown params and unresolved values pass through unchanged.
 */
export function translateFilterParams(
  params: URLSearchParams,
  sourceLang: string,
  targetLang: string,
): URLSearchParams {
  const out = new URLSearchParams();
  params.forEach((value, key) => {
    if (key === "_proj_country") {
      const dbV = countrySlugToValue(value, sourceLang);
      const slug = dbV ? countryValueToSlug(dbV, targetLang) : null;
      out.set(key, slug || value);
      return;
    }
    const dynamicType =
      key === "_tipologia" ? "products" :
      key === "_proj_type" ? "projects" :
      key === "_article_type" ? "news" :
      key === "_campaigns_type" ? "campaigns" :
      null;
    if (dynamicType) {
      const translated = translateFilterSlug(dynamicType, value, sourceLang, targetLang);
      out.set(key, translated || value);
      return;
    }
    out.set(key, value);
  });
  return out;
}
