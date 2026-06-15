import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { sendMail } from "@/lib/mail";
import { loadTemplateForLang } from "@/lib/email-template-i18n";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";

export const dynamic = "force-dynamic";

/**
 * Bulk email cross-entità a una lista di indirizzi arbitrari (Clienti store,
 * Professionisti, Iscritti newsletter, lead). Per ciascuna email:
 *  1. Cerca la lingua preferita consultando in ordine
 *     Customer → Professional → NewsletterSubscriber (default "it").
 *  2. Carica il template nella lingua giusta (via loadTemplateForLang) con
 *     fallback al template base IT.
 *  3. Renderizza i blocchi sostituendo {{firstName}}, {{lastName}}, {{email}}.
 *  4. Invia con sendMail; raccoglie esiti.
 *
 * Body: { emails: string[], templateId: string }
 * Returns: { success, data: { sent, failed, total, errors? } }
 */
export async function POST(req: Request) {
  const result = await requirePermission("email_templates", "view");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const rawEmails: unknown = body.emails;
    const templateId = String(body.templateId || "").trim();
    // Modalità "email semplice": invia direttamente {subject, html} senza template.
    const rawSubject = typeof body.subject === "string" ? body.subject.trim() : "";
    const rawHtml = typeof body.html === "string" ? body.html : "";
    const simpleMode = !templateId && (rawSubject || rawHtml);
    if (!templateId && !simpleMode) {
      return NextResponse.json({ success: false, error: "Specifica un template oppure subject+html" }, { status: 400 });
    }
    if (simpleMode && (!rawSubject || !rawHtml)) {
      return NextResponse.json({ success: false, error: "Per email semplice serve sia oggetto che corpo" }, { status: 400 });
    }
    if (!Array.isArray(rawEmails) || rawEmails.length === 0) {
      return NextResponse.json({ success: false, error: "Nessun destinatario" }, { status: 400 });
    }
    const emails = Array.from(new Set(
      rawEmails.filter((x): x is string => typeof x === "string")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    ));
    if (emails.length === 0) return NextResponse.json({ success: false, error: "Email non valide" }, { status: 400 });
    if (emails.length > 1000) return NextResponse.json({ success: false, error: "Massimo 1000 email per richiesta" }, { status: 400 });

    // Carica anagrafica + lingua da tutte le tabelle in 3 query parallele.
    const [customers, professionals, subscribers] = await Promise.all([
      prisma.customer.findMany({
        where: { email: { in: emails } },
        select: { email: true, firstName: true, lastName: true, language: true },
      }),
      prisma.professional.findMany({
        where: { email: { in: emails } },
        select: { email: true, firstName: true, lastName: true, language: true },
      }),
      prisma.newsletterSubscriber.findMany({
        where: { email: { in: emails } },
        select: { email: true, firstName: true, lastName: true, languageCode: true },
      }),
    ]);

    // Indicizza per email (priorità Customer > Pro > Subscriber per nome/cognome,
    // priorità Pro > Customer > Subscriber per lingua: pro ha tipicamente
    // lingua più specifica perché impostata in fase di registrazione consapevole).
    const byEmail = new Map<string, { firstName: string; lastName: string; language: string }>();
    for (const s of subscribers) {
      byEmail.set(s.email.toLowerCase(), {
        firstName: s.firstName || "", lastName: s.lastName || "",
        language: s.languageCode || "it",
      });
    }
    for (const c of customers) {
      const cur = byEmail.get(c.email.toLowerCase()) || { firstName: "", lastName: "", language: "it" };
      byEmail.set(c.email.toLowerCase(), {
        firstName: c.firstName || cur.firstName,
        lastName: c.lastName || cur.lastName,
        language: c.language || cur.language,
      });
    }
    for (const p of professionals) {
      const cur = byEmail.get(p.email.toLowerCase()) || { firstName: "", lastName: "", language: "it" };
      byEmail.set(p.email.toLowerCase(), {
        firstName: p.firstName || cur.firstName,
        lastName: p.lastName || cur.lastName,
        language: p.language || cur.language, // pro vince sulla lingua
      });
    }

    // Cache template per lingua per evitare N query DB identiche.
    const tplCache = new Map<string, { subject: string; blocks: string } | null>();
    const loadTpl = async (lang: string) => {
      const key = lang || "it";
      if (tplCache.has(key)) return tplCache.get(key)!;
      const tpl = await loadTemplateForLang(templateId, key);
      const val = tpl ? { subject: tpl.subject, blocks: tpl.blocks } : null;
      tplCache.set(key, val);
      return val;
    };

    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    // Invio sequenziale per non saturare SMTP. Per 100+ email considerare coda.
    for (const email of emails) {
      const meta = byEmail.get(email) || { firstName: "", lastName: "", language: "it" };
      const variables = {
        firstName: meta.firstName,
        lastName: meta.lastName,
        email,
      };

      let html: string;
      let subject: string;
      try {
        if (simpleMode) {
          // Email semplice: sostituisce solo variabili nel subject+body grezzi.
          subject = rawSubject;
          html = rawHtml;
        } else {
          const tpl = await loadTpl(meta.language);
          if (!tpl) {
            failed++; errors.push({ email, error: "Template non trovato" });
            continue;
          }
          const blocks = parseBlocks(tpl.blocks);
          html = renderEmailTemplate(blocks, variables);
          subject = tpl.subject;
        }
        for (const [k, v] of Object.entries(variables)) {
          subject = subject.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
          html    = html.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
        }
        const ok = await sendMail(email, subject, html);
        if (ok) sent++;
        else { failed++; errors.push({ email, error: "sendMail false" }); }
      } catch (e) {
        failed++;
        errors.push({ email, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      data: { sent, failed, total: emails.length, ...(errors.length ? { errors: errors.slice(0, 50) } : {}) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin/persone/bulk-email] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** GET — lista template disponibili (per popolare il dropdown nel modal) */
export async function GET() {
  const result = await requirePermission("email_templates", "view");
  if (isErrorResponse(result)) return result;
  const templates = await prisma.emailTemplate.findMany({
    where: { isActive: true },
    select: { id: true, name: true, subject: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ success: true, data: templates });
}
