/**
 * Robust slug→label lookup for ContentCategory/Typology/Subcategory translations.
 *
 * The DB stores `value` inconsistently across content types: sometimes uppercase
 * slug ("CLASSICI"), sometimes label-style ("Sedie"), sometimes lowercase
 * dash-slug ("rassegna-stampa"). The corresponding entity (Product.category,
 * NewsArticle.category, Project.type, Campaign.type) doesn't always match the
 * exact case/format. We enrich the map with case-insensitive and slugified
 * variants so the lookup succeeds regardless.
 */

export function buildLabelLookup(items: { value: string; label: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of items) {
    if (!c?.value) continue;
    const label = c.label || c.value;
    const v = c.value;
    const lc = v.toLowerCase().trim();
    const slug = lc.replace(/\s+/g, "-");
    const spaced = lc.replace(/-/g, " ");
    if (!m.has(v)) m.set(v, label);
    if (!m.has(lc)) m.set(lc, label);
    if (!m.has(slug)) m.set(slug, label);
    if (!m.has(spaced)) m.set(spaced, label);
  }
  return m;
}

export function lookupLabel(m: Map<string, string>, value: string | null | undefined): string {
  if (!value) return "";
  if (m.has(value)) return m.get(value)!;
  const lc = value.toLowerCase().trim();
  if (m.has(lc)) return m.get(lc)!;
  const slug = lc.replace(/\s+/g, "-");
  if (m.has(slug)) return m.get(slug)!;
  const spaced = lc.replace(/-/g, " ");
  if (m.has(spaced)) return m.get(spaced)!;
  return value;
}
