import type { ProfessionalRole } from "@prisma/client";
import { tPro } from "@/lib/pro-translations";

/**
 * Mappatura sezioni area riservata professionisti. Ogni professionista, in
 * base al suo `role`, vede solo un sottoinsieme di queste pagine.
 *
 * - ARCHITECT_DESIGNER  → informazioni tecniche, digital&media, cataloghi, pcon
 * - PRESS               → digital&media, press kit
 * - RESELLER + AGENT    → tutte di ARCHITECT + listino prezzi + materiale aziendale
 *
 * Le label/descrizioni sono tradotte tramite `pro-translations.ts` in base alla
 * lingua del professionista.
 */

export interface ProSection {
  slug: string;
  label: string;
  description: string;
}

const SECTION_KEYS: Record<string, { labelKey: string; descKey: string }> = {
  "informazioni-tecniche": { labelKey: "section.informazioni-tecniche.label", descKey: "section.informazioni-tecniche.desc" },
  "digital-media":         { labelKey: "section.digital-media.label",         descKey: "section.digital-media.desc" },
  "cataloghi":             { labelKey: "section.cataloghi.label",             descKey: "section.cataloghi.desc" },
  "pcon":                  { labelKey: "section.pcon.label",                  descKey: "section.pcon.desc" },
  "press-kit":             { labelKey: "section.press-kit.label",             descKey: "section.press-kit.desc" },
  "listino-prezzi":        { labelKey: "section.listino-prezzi.label",        descKey: "section.listino-prezzi.desc" },
  "materiale-aziendale":   { labelKey: "section.materiale-aziendale.label",   descKey: "section.materiale-aziendale.desc" },
};

export const SECTIONS_BY_ROLE: Record<ProfessionalRole, string[]> = {
  ARCHITECT_DESIGNER: ["informazioni-tecniche", "digital-media", "cataloghi", "pcon"],
  PRESS: ["digital-media", "press-kit"],
  RESELLER: ["informazioni-tecniche", "digital-media", "cataloghi", "pcon", "listino-prezzi", "materiale-aziendale"],
  AGENT: ["informazioni-tecniche", "digital-media", "cataloghi", "pcon", "listino-prezzi", "materiale-aziendale"],
};

export function getSectionsForRole(role: ProfessionalRole, lang: string | null | undefined): ProSection[] {
  return (SECTIONS_BY_ROLE[role] || [])
    .map((slug) => getSection(slug, lang))
    .filter((s): s is ProSection => s !== null);
}

export function getSection(slug: string, lang: string | null | undefined): ProSection | null {
  const k = SECTION_KEYS[slug];
  if (!k) return null;
  return {
    slug,
    label: tPro(lang, k.labelKey),
    description: tPro(lang, k.descKey),
  };
}

export function isSectionAllowedForRole(slug: string, role: ProfessionalRole): boolean {
  return SECTIONS_BY_ROLE[role]?.includes(slug) ?? false;
}
