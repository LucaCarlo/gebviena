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
 * Riconosce nomi gibberish tipici di bot che usano stringhe random (es.
 * "KMzEvVeXjFvVhIQrNRM", "trjdCYvbbzVuHODYWoEXHue"). Pattern:
 *  - lunghezza >= 8
 *  - molte transizioni maiuscolo↔minuscolo in posizioni casuali
 *  - lunghe sequenze di consonanti
 *  - bassa proporzione di vocali
 *
 * Non blocca nomi multi-parola legittimi tipo "Wei Lun Roger Ng" né italiani
 * con casing standard ("Bianchi", "Rossi", "Maria Cheti Grazia").
 */
export function isLikelyGibberishName(raw: string): boolean {
  const name = (raw || "").trim();
  if (name.length < 10) return false;

  // Considera la parola alfabetica più lunga (split su spazi/hyphen per non
  // colpire nomi composti tipo "Heidemarie-Schwarz-Hopfgartner").
  const words = name.split(/[\s\-]+/).filter((w) => /[a-zA-Z]/.test(w));
  const longest = words.reduce((a, b) => (a.length >= b.length ? a : b), "");
  if (longest.length < 10) return false;

  const letters = longest.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 10) return false;

  // Conta tutto in una passata
  let transitions = 0;
  let lowerToUpper = 0;
  for (let i = 1; i < letters.length; i++) {
    const prev = letters[i - 1];
    const curr = letters[i];
    const prevUp = prev === prev.toUpperCase() && prev !== prev.toLowerCase();
    const currUp = curr === curr.toUpperCase() && curr !== curr.toLowerCase();
    if (prevUp !== currUp) transitions++;
    if (!prevUp && currUp) lowerToUpper++;
  }
  const upperCount = (letters.match(/[A-Z]/g) || []).length;
  const upperRatio = upperCount / letters.length;

  // 1. Alternanze case >50% = mixed-case random (es. "KMzEvVeXjFvVh")
  if (transitions >= letters.length / 2) return true;

  // 2. Multiple maiuscole interne (lower→Upper jumps) su parola lunga.
  //    "AnnaMaria"=1 jump → NO. "pfBVAxujgpqiBjhhf"=2 jumps su 17 char → MATCH.
  if (lowerToUpper >= 2 && letters.length >= 12) return true;

  // 3. Uppercase sparse 35–90% (= mixed). Escluso CAPS LOCK pieno (>=90%) che
  //    sono utenti reali tipo "GILDA RONCAGLIONI", "DINA SHCHERBAKOVA".
  if (upperRatio >= 0.35 && upperRatio < 0.9) return true;

  // 4. 6+ consonanti consecutive (lowercase, soglia conservativa per DE/scand
  //    legittimi: "Brandstetter"=4, "Oelschlägel"=5, "Herbertstraße"=5).
  const lower = letters.toLowerCase();
  if (/[bcdfghjklmnpqrstvwxz]{6,}/.test(lower)) return true;

  return false;
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
