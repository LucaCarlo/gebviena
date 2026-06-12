import { prisma } from "@/lib/prisma";

/**
 * Carica i Setting del gruppo "professionals". Helper server-side per la
 * dashboard area pro, la pagina manutenzione e i singoli page guard.
 *
 * Cache breve in-process (10s) per non hammerare il DB ad ogni navigazione
 * dell'utente — i settings cambiano solo quando l'admin tocca le tab.
 */

interface ProSettings {
  areaDisabled: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  pconEnabled: boolean;
  pconProductSlug: string;
  // sectionVisibleByRole[role][slug] → boolean (NULL/undefined = usa default sections.ts)
  sectionOverride: Record<string, Record<string, boolean>>;
}

const DEFAULT_MAINT_TITLE = "Area in manutenzione";
const DEFAULT_MAINT_MESSAGE = "Stiamo aggiornando l’area riservata ai professionisti. Torna a trovarci tra poco — grazie per la pazienza.";

let cache: { ts: number; data: ProSettings } | null = null;
const CACHE_MS = 10_000;

export function invalidateProSettingsCache() { cache = null; }

export async function getProSettings(): Promise<ProSettings> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.data;
  const rows = await prisma.setting.findMany({ where: { group: "professionals" } });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const sectionOverride: Record<string, Record<string, boolean>> = {};
  map.forEach((v, k) => {
    const m = k.match(/^professionals\.section\.([A-Z_]+)\.(.+)$/);
    if (m) {
      const [, role, slug] = m;
      if (!sectionOverride[role]) sectionOverride[role] = {};
      sectionOverride[role][slug] = v === "true";
    }
  });

  const data: ProSettings = {
    areaDisabled: map.get("professionals.area.disabled") === "true",
    maintenanceTitle: map.get("professionals.maintenance.title") || DEFAULT_MAINT_TITLE,
    maintenanceMessage: map.get("professionals.maintenance.message") || DEFAULT_MAINT_MESSAGE,
    pconEnabled: map.get("professionals.pcon.enabled") !== "false",
    pconProductSlug: map.get("professionals.pcon.product_slug") || "",
    sectionOverride,
  };
  cache = { ts: Date.now(), data };
  return data;
}

/**
 * Decide se una sezione è visibile per un ruolo, considerando le override
 * dell'admin. Se nessuna override esiste → ricade sul default di sections.ts.
 */
export function isSectionVisible(
  settings: ProSettings,
  role: string,
  slug: string,
  fallbackDefault: boolean,
): boolean {
  const ov = settings.sectionOverride[role];
  if (ov && Object.prototype.hasOwnProperty.call(ov, slug)) return ov[slug];
  // Caso speciale: pCon ha anche un flag globale.
  if (slug === "pcon" && !settings.pconEnabled) return false;
  return fallbackDefault;
}
