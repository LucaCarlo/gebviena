// Gatekeeper di produzione GTV. Le regole PropertyList (hide Series, ecc.)
// sono agganciate qui lato pCon. Tutti i prodotti del sito usano questo
// gatekeeper. EAIWS è risolto automaticamente dal gatekeeper di produzione.
export const PCON_BASE_URL =
  "https://ui.pcon-solutions.com/#GATEKEEPER_ID=6a06d3f5a82e1";

export const PCON_DEFAULT_MOC = "GTV";
export const PCON_DEFAULT_LANG = "it";

export interface PconConfig {
  moc?: string | null;
  ban?: string | null;
  sid?: string | null;
  ovc?: string | null;
  lang?: string | null;
}

export function hasPconConfig(p: PconConfig): boolean {
  return Boolean(p.ban && p.ban.trim().length > 0);
}

export function buildPconUrl(p: PconConfig): string {
  const parts: string[] = [PCON_BASE_URL];
  const moc = (p.moc && p.moc.trim()) || PCON_DEFAULT_MOC;
  parts.push(`moc=${encodeURIComponent(moc)}`);
  if (p.ban && p.ban.trim()) parts.push(`ban=${encodeURIComponent(p.ban.trim())}`);
  if (p.sid && p.sid.trim()) parts.push(`sid=${encodeURIComponent(p.sid.trim())}`);
  if (p.ovc && p.ovc.trim()) parts.push(`ovc=${encodeURIComponent(p.ovc.trim())}`);
  const lang = (p.lang && p.lang.trim()) || PCON_DEFAULT_LANG;
  parts.push(`lang=${encodeURIComponent(lang)}`);
  // sh=false → nasconde la barra "Aprire il catalogo" in alto al configuratore.
  parts.push("sh=false");
  return parts.join("&");
}

export function buildPconAdminUrl(p: PconConfig = {}): string {
  const url = buildPconUrl(p);
  return `${url}&ap=true`;
}

export function parsePconUrl(raw: string): PconConfig {
  const out: PconConfig = {};
  if (!raw) return out;
  const hashIdx = raw.indexOf("#");
  const query = hashIdx >= 0 ? raw.slice(hashIdx + 1) : raw;
  const pairs = query.split("&");
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const key = pair.slice(0, eq);
    const val = decodeURIComponent(pair.slice(eq + 1));
    switch (key) {
      case "moc": out.moc = val; break;
      case "ban": out.ban = val; break;
      case "sid": out.sid = val; break;
      case "ovc": out.ovc = val; break;
      case "lang": out.lang = val; break;
    }
  }
  return out;
}

export function summarizePconOvc(ovc: string | null | undefined): string[] {
  if (!ovc) return [];
  return ovc
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Sostituisce il parametro `lang=` nell'URL del configuratore pCon con la
 * lingua corrente del sito. Se il parametro non c'è, lo aggiunge.
 * Mantiene intatto l'hash (#) e gli altri parametri.
 *
 * Lingue pCon supportate: it, en, de, fr, es, nl, ...
 */
export function withPconLang(url: string, lang: string | null | undefined): string {
  if (!url) return url;
  const code = (lang || "").trim().toLowerCase() || PCON_DEFAULT_LANG;
  if (/[?&#]lang=[^&]*/.test(url)) {
    return url.replace(/([?&#])lang=[^&]*/, `$1lang=${encodeURIComponent(code)}`);
  }
  const sep = url.includes("#") || url.includes("?") ? "&" : "#";
  return `${url}${sep}lang=${encodeURIComponent(code)}`;
}
