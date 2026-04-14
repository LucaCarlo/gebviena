import { prisma } from "./prisma";
import { translateSegmentsBackward, SEGMENT_TRANSLATIONS } from "./path-segments";

const LANG_PREFIXES = Object.keys(SEGMENT_TRANSLATIONS);

/** Strip lang prefix and translate segments back to IT canonical. */
function toCanonicalPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 0 && LANG_PREFIXES.includes(segments[0])) {
    const lang = segments[0];
    const rest = translateSegmentsBackward(segments.slice(1), lang);
    return "/" + rest.join("/");
  }
  return "/" + segments.join("/");
}

/**
 * Static (non-dynamic) public routes of the site, in canonical IT form.
 * Used to validate that a redirect destination is a real page.
 */
const STATIC_PATHS = new Set<string>([
  "/",
  "/prodotti",
  "/designers",
  "/progetti",
  "/campagne-e-video",
  "/news-e-rassegna-stampa",
  "/mondo-gtv",
  "/mondo-gtv/brand-manifesto",
  "/mondo-gtv/heritage",
  "/mondo-gtv/curvatura-legno",
  "/mondo-gtv/sostenibilita",
  "/mondo-gtv/designer-e-premi",
  "/mondo-gtv/gtv-experience",
  "/professionisti",
  "/professionisti/cataloghi",
  "/professionisti/materiale-tecnico",
  "/professionisti/realizzazioni-custom",
  "/contatti",
  "/contatti/collaborazioni",
  "/contatti/rete-vendita",
  "/contatti/richiesta-info",
  "/contatti/ufficio-stampa",
  "/contatti/landing-page",
  "/privacy-policy",
  "/cookie-policy",
]);

/**
 * Validates that a given path corresponds to an existing public page.
 * - Static routes: lookup in STATIC_PATHS
 * - Dynamic detail: /prodotti/<slug>, /designers/<slug>, /progetti/<slug>, /news-e-rassegna-stampa/<slug>
 *   verified against the DB (also checks translation slugs).
 * - Landing pages: /lp/<permalink> verified against LandingPageConfig.slug
 * - External URLs (http://... or https://...) are allowed without check.
 */
export async function validateDestinationPath(path: string): Promise<{ ok: boolean; reason?: string }> {
  if (!path || typeof path !== "string") return { ok: false, reason: "Path vuoto" };

  // External URL: allowed
  if (/^https?:\/\//i.test(path)) return { ok: true };

  // Must start with "/"
  const p = path.trim();
  if (!p.startsWith("/")) return { ok: false, reason: "Il path deve iniziare con /" };

  // Strip query/hash + trailing slash, then convert to IT canonical (handles /en/products/...)
  const rawPath = p.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const cleanPath = toCanonicalPath(rawPath) || "/";

  if (STATIC_PATHS.has(cleanPath)) return { ok: true };

  // Dynamic patterns
  const segments = cleanPath.split("/").filter(Boolean);

  if (segments.length === 2) {
    const [section, slug] = segments;
    switch (section) {
      case "prodotti": {
        const ok =
          (await prisma.product.findFirst({ where: { slug, isActive: true }, select: { id: true } })) ||
          (await prisma.productTranslation.findFirst({ where: { slug }, select: { id: true } }));
        return ok ? { ok: true } : { ok: false, reason: `Prodotto con slug "${slug}" non trovato` };
      }
      case "designers": {
        const ok =
          (await prisma.designer.findFirst({ where: { slug, isActive: true }, select: { id: true } })) ||
          (await prisma.designerTranslation.findFirst({ where: { slug }, select: { id: true } }));
        return ok ? { ok: true } : { ok: false, reason: `Designer con slug "${slug}" non trovato` };
      }
      case "progetti": {
        const ok =
          (await prisma.project.findFirst({ where: { slug, isActive: true }, select: { id: true } })) ||
          (await prisma.projectTranslation.findFirst({ where: { slug }, select: { id: true } }));
        return ok ? { ok: true } : { ok: false, reason: `Progetto con slug "${slug}" non trovato` };
      }
      case "news-e-rassegna-stampa": {
        const ok =
          (await prisma.newsArticle.findFirst({ where: { slug, isActive: true }, select: { id: true } })) ||
          (await prisma.newsArticleTranslation.findFirst({ where: { slug }, select: { id: true } }));
        return ok ? { ok: true } : { ok: false, reason: `Articolo con slug "${slug}" non trovato` };
      }
      case "campagne-e-video": {
        const ok =
          (await prisma.campaign.findFirst({ where: { slug, isActive: true }, select: { id: true } })) ||
          (await prisma.campaignTranslation.findFirst({ where: { slug }, select: { id: true } }));
        return ok ? { ok: true } : { ok: false, reason: `Campagna con slug "${slug}" non trovato` };
      }
      case "lp": {
        const ok = await prisma.landingPageConfig.findFirst({ where: { slug }, select: { id: true } });
        return ok ? { ok: true } : { ok: false, reason: `Landing page "${slug}" non trovata` };
      }
    }
  }

  return { ok: false, reason: "Path non corrisponde a nessuna pagina del sito" };
}
