/**
 * Bidirectional mapping between DB enum/label values and URL slugs per language.
 *
 * URL convention:
 *   - Products:  /<lang>/<productsSegment>?_tipologia=<slug>
 *   - Projects:  /<lang>/<projectsSegment>?_proj_type=<slug>&_proj_country=<slug>&_proj_product=<prodSlug>
 *
 * Where <slug> is lowercase, hyphenated, language-specific. The lookup converts
 * the slug to the DB value before hitting the API. Reverse lookup is used when
 * building outbound links (so an IT→FR language switch translates the params).
 *
 * NOTE: _proj_product uses Product.slug directly (not mapped here).
 */
export type Lang = "it" | "en" | "de" | "fr" | "es";
export const LANGS: Lang[] = ["it", "en", "de", "fr", "es"];

// ─── PROJECT TYPE (Project.type enum) ────────────────────────────────────────
export const PROJECT_TYPE_SLUGS: Record<string, Record<Lang, string>> = {
  BISTROT_RESTAURANT: {
    it: "bistrot-restaurant",
    fr: "bistrots-restaurants",
    en: "bistros-restaurants",
    de: "bistros-restaurants",
    es: "bistros-restaurantes",
  },
  HOTELLERIE: {
    it: "hotellerie",
    fr: "hotellerie",
    en: "hotellerie",
    de: "hotellerie",
    es: "hosteleria",
  },
  SPAZI_CULTURALI: {
    it: "spazi-culturali",
    fr: "espaces-culturels",
    en: "cultural-spaces",
    de: "kulturraume",
    es: "espacios-culturales",
  },
  RESIDENZIALE: {
    it: "residenziali",
    fr: "residentiels",
    en: "residential",
    de: "wohnen",
    es: "residenciales",
  },
};

// ─── PRODUCT CATEGORY (Product.category macro) ───────────────────────────────
export const PRODUCT_CATEGORY_SLUGS: Record<string, Record<Lang, string>> = {
  CLASSICI: {
    it: "classici",
    fr: "les-classiques",
    en: "classics",
    de: "klassiker",
    es: "clasicos",
  },
  TAVOLI: {
    it: "tavoli",
    fr: "tables",
    en: "tables",
    de: "tische",
    es: "mesas",
  },
  SEDUTE: {
    it: "sedute",
    fr: "assises",
    en: "seating",
    de: "sitze",
    es: "asientos",
  },
  IMBOTTITI: {
    it: "imbottiti",
    fr: "rembourres",
    en: "upholstered",
    de: "polstermobel",
    es: "tapizados",
  },
  COMPLEMENTI: {
    it: "complementi",
    fr: "complements",
    en: "accessories",
    de: "zubehor",
    es: "complementos",
  },
  OUTDOOR: {
    it: "outdoor",
    fr: "outdoor",
    en: "outdoor",
    de: "outdoor",
    es: "outdoor",
  },
  "NOVITÀ_2025": {
    it: "novita-2025",
    fr: "nouveautes-2025",
    en: "new-2025",
    de: "neuheiten-2025",
    es: "novedades-2025",
  },
};

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

const PROJECT_TYPE_REVERSE = buildReverseMap(PROJECT_TYPE_SLUGS);
const PRODUCT_CATEGORY_REVERSE = buildReverseMap(PRODUCT_CATEGORY_SLUGS);
const COUNTRY_REVERSE = buildReverseMap(COUNTRY_SLUGS);

function isLang(x: string | undefined | null): x is Lang {
  return !!x && LANGS.includes(x as Lang);
}

/** slug (in given lang) → DB enum/value. Returns null if not found. */
export function projectTypeSlugToEnum(slug: string, lang: string): string | null {
  if (!isLang(lang)) return null;
  return PROJECT_TYPE_REVERSE[lang][slug] || null;
}
export function productCategorySlugToEnum(slug: string, lang: string): string | null {
  if (!isLang(lang)) return null;
  return PRODUCT_CATEGORY_REVERSE[lang][slug] || null;
}
export function countrySlugToValue(slug: string, lang: string): string | null {
  if (!isLang(lang)) return null;
  return COUNTRY_REVERSE[lang][slug] || null;
}

/** DB enum/value → slug in given lang. Falls back to IT if the target lang
 *  is missing (shouldn't happen if mapping is complete). */
export function projectTypeEnumToSlug(enumValue: string, lang: string): string | null {
  if (!isLang(lang)) return null;
  return PROJECT_TYPE_SLUGS[enumValue]?.[lang] || PROJECT_TYPE_SLUGS[enumValue]?.it || null;
}
export function productCategoryEnumToSlug(enumValue: string, lang: string): string | null {
  if (!isLang(lang)) return null;
  return PRODUCT_CATEGORY_SLUGS[enumValue]?.[lang] || PRODUCT_CATEGORY_SLUGS[enumValue]?.it || null;
}
export function countryValueToSlug(value: string, lang: string): string | null {
  if (!isLang(lang)) return null;
  return COUNTRY_SLUGS[value]?.[lang] || COUNTRY_SLUGS[value]?.it || null;
}

/**
 * Re-translate all known filter query params between languages. Used when the
 * language switcher changes /fr/... to /en/..., the filter slugs must adapt.
 *
 * Input: URLSearchParams in sourceLang. Output: a new URLSearchParams in
 * targetLang, with unknown keys preserved as-is.
 */
export function translateFilterParams(
  params: URLSearchParams,
  sourceLang: string,
  targetLang: string,
): URLSearchParams {
  const out = new URLSearchParams();
  params.forEach((value, key) => {
    if (key === "_proj_type") {
      const enumV = projectTypeSlugToEnum(value, sourceLang);
      const slug = enumV ? projectTypeEnumToSlug(enumV, targetLang) : null;
      if (slug) out.set(key, slug);
      else out.set(key, value);
    } else if (key === "_proj_country") {
      const dbV = countrySlugToValue(value, sourceLang);
      const slug = dbV ? countryValueToSlug(dbV, targetLang) : null;
      if (slug) out.set(key, slug);
      else out.set(key, value);
    } else if (key === "_tipologia") {
      const enumV = productCategorySlugToEnum(value, sourceLang);
      const slug = enumV ? productCategoryEnumToSlug(enumV, targetLang) : null;
      if (slug) out.set(key, slug);
      else out.set(key, value);
    } else {
      out.set(key, value);
    }
  });
  return out;
}
