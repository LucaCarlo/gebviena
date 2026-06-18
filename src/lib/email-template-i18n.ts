import { prisma } from "@/lib/prisma";

/**
 * Carica un template email nella lingua richiesta.
 *
 * Comportamento sicuro / retro-compatible:
 *  - Se per `templateId` + `lang` esiste una `EmailTemplateTranslation`,
 *    ritorna subject + blocks della traduzione.
 *  - Altrimenti ritorna subject + blocks del template base (IT).
 *  - Se il template non esiste affatto, ritorna null.
 *
 * Tutti i flussi esistenti che continuano a chiamare direttamente
 * `prisma.emailTemplate.findUnique` restano invariati: nessun comportamento
 * cambia per loro. Questa funzione è opt-in per i nuovi flussi che vogliono
 * il multilingua.
 */
export async function loadTemplateForLang(
  templateId: string,
  lang: string | null | undefined
): Promise<{ id: string; subject: string; blocks: string; name: string } | null> {
  const base = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, name: true, subject: true, blocks: true },
  });
  if (!base) return null;

  const code = (lang || "").toLowerCase().trim();
  // IT è la lingua del template base — niente traduzione da cercare.
  if (!code || code === "it") return base;

  const tr = await prisma.emailTemplateTranslation.findUnique({
    where: { templateId_languageCode: { templateId, languageCode: code } },
    select: { subject: true, blocks: true },
  }).catch(() => null);

  if (!tr) return base; // fallback al template base
  return {
    id: base.id,
    name: base.name,
    subject: (tr.subject || "").trim() || base.subject,
    blocks: (tr.blocks || "").trim() || base.blocks,
  };
}

/** Cerca un template per name (univoco di fatto, anche se non DB-enforced).
 *  Usato per risolvere il template "Approvazione Area Professionisti" senza
 *  dover hardcodare un id. */
export async function findTemplateByName(name: string) {
  return prisma.emailTemplate.findFirst({
    where: { name },
    select: { id: true },
  });
}
