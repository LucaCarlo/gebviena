/**
 * Helper anti-spam per form pubblici (newsletter, contatti, registrazioni evento).
 *
 * Due funzioni:
 *  - normalizeEmail: forma canonica (lowercase + Gmail: rimuove punti + tag "+")
 *    Gmail tratta "john.doe@gmail.com", "johndoe@gmail.com" e "j.o.h.n.doe@gmail.com"
 *    come la STESSA casella. I bot abusano di questo per creare N iscrizioni dallo
 *    stesso utente reale (Gmail "dot abuse"). Salviamo la versione canonica così
 *    `unique(email)` di Prisma li dedupa.
 *
 *  - isLikelyDotSpam: euristica per rilevare il pattern bot tipico
 *    `a.b.c.d.e.f@gmail.com` (3+ punti nel local part di Gmail con segmenti corti).
 *    Usabile per rifiutare a priori senza nemmeno scrivere in DB.
 */

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function normalizeEmail(raw: string): string {
  const e = (raw || "").trim().toLowerCase();
  const at = e.indexOf("@");
  if (at < 0) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return e;

  // Gmail: rimuovi punti + tutto ciò che segue "+"
  const plusIdx = local.indexOf("+");
  const localNoTag = plusIdx >= 0 ? local.slice(0, plusIdx) : local;
  const localNoDots = localNoTag.replace(/\./g, "");
  return `${localNoDots}@gmail.com`;
}

/**
 * Riconosce il pattern "Gmail dot abuse" tipico dei bot:
 * - dominio gmail.com / googlemail.com
 * - 3+ punti nel local part
 * - segmenti corti (lunghezza media < 3 caratteri) — indica scrambling artificiale
 *   (un umano scrive "john.doe", non "j.o.hn.d.o.e")
 */
export function isLikelyDotSpam(raw: string): boolean {
  const e = (raw || "").trim().toLowerCase();
  const at = e.indexOf("@");
  if (at < 0) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return false;

  const dots = (local.match(/\./g) || []).length;
  if (dots < 3) return false;

  // Doppio punto consecutivo "a..b" → invalido per Gmail ma alcuni endpoint
  // lo accettano: spam quasi certo.
  if (local.includes("..")) return true;

  const segments = local.split(".");
  const avgLen = local.replace(/\./g, "").length / segments.length;
  // Tipo "o.qe.h.i.d.aw.51" → 8 segmenti, len medio ~1.4 → spam
  // Tipo "john.maria.bianchi.rossi" → 4 segmenti, len medio ~5 → ok
  return avgLen < 2.5;
}
