import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ALLOWED_LANGS = new Set(["fr", "en", "de", "es"]);
// IT è la lingua del template base (EmailTemplate.subject/blocks). Non
// permettiamo di salvarne una traduzione separata: si modifica il template
// base. Questa restrizione semplifica il modello mentale per l'admin.

/** GET — singola traduzione (404 se non esiste) */
export async function GET(_req: Request, { params }: { params: { id: string; lang: string } }) {
  const result = await requirePermission("email_templates", "view");
  if (isErrorResponse(result)) return result;

  const lang = params.lang.toLowerCase();
  if (!ALLOWED_LANGS.has(lang)) {
    return NextResponse.json({ success: false, error: "Lingua non gestita (usa fr/en/de/es)" }, { status: 400 });
  }
  const tr = await prisma.emailTemplateTranslation.findUnique({
    where: { templateId_languageCode: { templateId: params.id, languageCode: lang } },
  });
  if (!tr) return NextResponse.json({ success: false, error: "Traduzione non trovata" }, { status: 404 });
  return NextResponse.json({ success: true, data: tr });
}

/** PUT — upsert traduzione (subject + blocks JSON) */
export async function PUT(req: Request, { params }: { params: { id: string; lang: string } }) {
  const result = await requirePermission("email_templates", "edit");
  if (isErrorResponse(result)) return result;

  const lang = params.lang.toLowerCase();
  if (!ALLOWED_LANGS.has(lang)) {
    return NextResponse.json({ success: false, error: "Lingua non gestita" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const subject = String(body.subject || "").trim();
    const blocks = typeof body.blocks === "string" ? body.blocks : JSON.stringify(body.blocks || []);
    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject obbligatorio" }, { status: 400 });
    }

    // Verifica che il template base esista (FK protegge ma diamo errore chiaro).
    const base = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!base) return NextResponse.json({ success: false, error: "Template non trovato" }, { status: 404 });

    const saved = await prisma.emailTemplateTranslation.upsert({
      where: { templateId_languageCode: { templateId: params.id, languageCode: lang } },
      create: { templateId: params.id, languageCode: lang, subject, blocks },
      update: { subject, blocks },
    });
    return NextResponse.json({ success: true, data: saved });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** DELETE — rimuove la traduzione (il template torna mono-lingua per quel codice) */
export async function DELETE(_req: Request, { params }: { params: { id: string; lang: string } }) {
  const result = await requirePermission("email_templates", "edit");
  if (isErrorResponse(result)) return result;

  const lang = params.lang.toLowerCase();
  if (!ALLOWED_LANGS.has(lang)) {
    return NextResponse.json({ success: false, error: "Lingua non gestita" }, { status: 400 });
  }
  await prisma.emailTemplateTranslation.delete({
    where: { templateId_languageCode: { templateId: params.id, languageCode: lang } },
  }).catch(() => { /* idempotent: se non c'è va bene */ });
  return NextResponse.json({ success: true });
}
