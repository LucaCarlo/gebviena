export const PCON_BASE_URL =
  "https://ui.pcon-solutions.com/#GATEKEEPER_ID=data_prev" +
  "&EAIWS_SERVER=https://data-preview.eaiws.pcon-solutions.com/stable" +
  "&EAIWS_STARTUP=_manual__demo_gtv_fcabfffc70ec100583d32005aeb1fb52122b9058";

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
