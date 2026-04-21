/**
 * Path segment translations for URL localization.
 * Italian = canonical (used as Next.js routes).
 * For other languages, segments are mapped both ways:
 *   - Forward: localizePath("/prodotti/foo", "en") → "/en/products/foo"
 *   - Backward (middleware): /en/products/foo → /prodotti/foo (internal rewrite)
 *
 * Slugs (last segment of detail pages) are NOT in this map; they come from
 * the per-entity Translation tables and are handled at the page level.
 */

export const DEFAULT_LANG = "it";

// IT segment → translation per lang
type SegmentMap = Record<string, Record<string, string>>;

export const SEGMENT_TRANSLATIONS: SegmentMap = {
  en: {
    prodotti: "products",
    designers: "designers",
    progetti: "projects",
    "campaigns": "campaigns-and-videos",
    "news": "news-and-press",
    "mondo-gtv": "the-gtv-world",
    "brand-manifesto": "brand-manifesto",
    heritage: "heritage",
    "curvatura-legno": "wood-bending",
    sostenibilita: "sustainability",
    "designer-e-premi": "designers-and-awards",
    "gtv-experience": "gtv-experience",
    professionisti: "professionals",
    cataloghi: "catalogs",
    "materiale-tecnico": "technical-material",
    "realizzazioni-custom": "custom-realizations",
    contatti: "contact",
    collaborazioni: "collaborations",
    "rete-vendita": "sales-network",
    "richiesta-info": "info-request",
    "ufficio-stampa": "press-office",
    "landing-page": "landing-page",
    "privacy-policy": "privacy-policy",
    "cookie-policy": "cookie-policy",
  },
  de: {
    prodotti: "produkte",
    designers: "designer",
    progetti: "projekte",
    "campaigns": "kampagnen-und-videos",
    "news": "news-und-presse",
    "mondo-gtv": "gtv-welt",
    "brand-manifesto": "markenmanifest",
    heritage: "geschichte",
    "curvatura-legno": "holzbiegen",
    sostenibilita: "nachhaltigkeit",
    "designer-e-premi": "designer-und-preise",
    "gtv-experience": "gtv-experience",
    professionisti: "fachleute",
    cataloghi: "kataloge",
    "materiale-tecnico": "technisches-material",
    "realizzazioni-custom": "sonderanfertigungen",
    contatti: "kontakt",
    collaborazioni: "kooperationen",
    "rete-vendita": "vertriebsnetz",
    "richiesta-info": "anfrage",
    "ufficio-stampa": "presse",
    "landing-page": "landing-page",
    "privacy-policy": "datenschutz",
    "cookie-policy": "cookie-richtlinien",
  },
  fr: {
    prodotti: "produits",
    designers: "designers",
    progetti: "projets",
    "campaigns": "campagnes-et-videos",
    "news": "actualites-et-presse",
    "mondo-gtv": "monde-gtv",
    "brand-manifesto": "manifeste-de-marque",
    heritage: "patrimoine",
    "curvatura-legno": "courbure-du-bois",
    sostenibilita: "durabilite",
    "designer-e-premi": "designers-et-prix",
    "gtv-experience": "gtv-experience",
    professionisti: "professionnels",
    cataloghi: "catalogues",
    "materiale-tecnico": "materiel-technique",
    "realizzazioni-custom": "realisations-sur-mesure",
    contatti: "contact",
    collaborazioni: "collaborations",
    "rete-vendita": "reseau-de-vente",
    "richiesta-info": "demande-info",
    "ufficio-stampa": "bureau-de-presse",
    "landing-page": "landing-page",
    "privacy-policy": "politique-de-confidentialite",
    "cookie-policy": "politique-de-cookies",
  },
  es: {
    prodotti: "productos",
    designers: "disenadores",
    progetti: "proyectos",
    "campaigns": "campanas-y-videos",
    "news": "noticias-y-prensa",
    "mondo-gtv": "mundo-gtv",
    "brand-manifesto": "manifiesto-de-marca",
    heritage: "herencia",
    "curvatura-legno": "curvado-de-madera",
    sostenibilita: "sostenibilidad",
    "designer-e-premi": "disenadores-y-premios",
    "gtv-experience": "gtv-experience",
    professionisti: "profesionales",
    cataloghi: "catalogos",
    "materiale-tecnico": "material-tecnico",
    "realizzazioni-custom": "realizaciones-a-medida",
    contatti: "contacto",
    collaborazioni: "colaboraciones",
    "rete-vendita": "red-de-ventas",
    "richiesta-info": "solicitud-info",
    "ufficio-stampa": "oficina-de-prensa",
    "landing-page": "landing-page",
    "privacy-policy": "politica-de-privacidad",
    "cookie-policy": "politica-de-cookies",
  },
};

// Build inverse maps once (translated → IT canonical) for middleware use.
export const REVERSE_SEGMENT_TRANSLATIONS: Record<string, Record<string, string>> = (() => {
  const out: Record<string, Record<string, string>> = {};
  for (const [lang, map] of Object.entries(SEGMENT_TRANSLATIONS)) {
    out[lang] = {};
    for (const [it, tr] of Object.entries(map)) out[lang][tr] = it;
  }
  return out;
})();

/** Forward translate IT segments to lang. Slug (last segment of [slug] routes) untouched. */
export function translateSegmentsForward(segments: string[], lang: string): string[] {
  if (lang === DEFAULT_LANG) return segments;
  const map = SEGMENT_TRANSLATIONS[lang];
  if (!map) return segments;
  return segments.map((s) => map[s] || s);
}

/** Backward translate (middleware) — maps lang segments back to IT canonical. */
export function translateSegmentsBackward(segments: string[], lang: string): string[] {
  if (lang === DEFAULT_LANG) return segments;
  const map = REVERSE_SEGMENT_TRANSLATIONS[lang];
  if (!map) return segments;
  return segments.map((s) => map[s] || s);
}

/**
 * Build a localized URL given an IT path and target lang.
 * Example: localizePath("/prodotti/sedia-14", "en") → "/en/products/sedia-14"
 * (Slug remains IT here; for slug translation use the per-entity slug at link time.)
 */
export function localizePath(path: string, lang: string, langPrefix?: string | null): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const segments = cleanPath ? cleanPath.split("/") : [];
  const translated = translateSegmentsForward(segments, lang);
  if (lang === DEFAULT_LANG) return "/" + translated.join("/");
  const prefix = langPrefix || lang;
  return `/${prefix}` + (translated.length ? "/" + translated.join("/") : "");
}
