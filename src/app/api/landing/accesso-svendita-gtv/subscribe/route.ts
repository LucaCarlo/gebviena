import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";
import { assignTagBySlug } from "@/lib/tags";
import { buildEmailFooterHtml, getEmailFooterConfig } from "@/lib/event-registration";
import { headers } from "next/headers";

const TEMPLATE_NAME = "Conferma pre-accesso svendita";
const PERMALINK = "accesso-svendita-gtv";
const TAG_SLUG_FALLBACK = "accesso-svendita-gtv";
const TAG_NAME_FALLBACK = "Accesso Svendita GTV";

/**
 * Default blocks used to bootstrap the confirmation template the first time
 * the endpoint is hit. After creation the admin can edit it freely from
 * /admin/email-templates without losing the linkage (we look it up by name).
 */
const DEFAULT_TEMPLATE_BLOCKS = [
  {
    type: "title",
    text: "Richiesta ricevuta",
    fontFamily: "Libre Caslon Text",
    fontSize: "30",
    color: "#1a1a1a",
    align: "left",
  },
  {
    type: "text",
    content:
      "Ciao {{firstName}},\n\ngrazie per esserti registrato/a alla Vendita Speciale di Gebrüder Thonet Vienna.\n\nLa tua richiesta di accesso è stata ricevuta correttamente. A breve ti contatteremo con le istruzioni per accedere alla selezione online.",
    fontFamily: "Arial",
    textColor: "#333333",
    align: "left",
  },
  { type: "divider" },
  {
    type: "text",
    content:
      "<strong>Periodo:</strong> dal 15 Maggio al 30 Giugno 2026<br/><strong>Showroom Torino:</strong> Via Foggia 23H — accesso diretto su appuntamento",
    fontFamily: "Arial",
    textColor: "#444444",
    align: "left",
  },
  { type: "spacer", height: 16 },
  {
    type: "text",
    content:
      "L'accesso online è riservato agli utenti registrati. I prodotti disponibili online e in showroom differiscono per tipologia e disponibilità. La registrazione non garantisce disponibilità sugli articoli.",
    fontFamily: "Arial",
    textColor: "#888888",
    align: "left",
  },
  { type: "spacer", height: 8 },
  {
    type: "text",
    content: "Gebrüder Thonet Vienna",
    fontFamily: "Arial",
    textColor: "#999999",
    align: "left",
  },
];

const DEFAULT_SUBJECT = "Conferma registrazione — Vendita Speciale GTV";

async function ensureTemplate() {
  const existing = await prisma.emailTemplate.findFirst({ where: { name: TEMPLATE_NAME } });
  if (existing) return existing;
  return prisma.emailTemplate.create({
    data: {
      name: TEMPLATE_NAME,
      subject: DEFAULT_SUBJECT,
      blocks: JSON.stringify(DEFAULT_TEMPLATE_BLOCKS),
      isActive: true,
      sortOrder: 0,
    },
  });
}

/**
 * Resolve the confirmation email pieces from the LandingPageConfig
 * (admin-editable: subject, template, footer, tag), falling back to
 * the auto-bootstrap template when no config exists.
 */
async function resolveConfig() {
  const lp = await prisma.landingPageConfig.findUnique({
    where: { permalink: PERMALINK },
    select: { tagSlug: true, name: true, emailTemplateId: true, emailSubject: true, emailFooter: true },
  });
  const tagSlug = lp?.tagSlug || TAG_SLUG_FALLBACK;
  const tagName = lp?.name || TAG_NAME_FALLBACK;
  const emailSubjectOverride = lp?.emailSubject?.trim() || "";
  const emailFooterJson = lp?.emailFooter || null;

  let template: { id: string; subject: string; blocks: string } | null = null;
  if (lp?.emailTemplateId) {
    template = await prisma.emailTemplate.findUnique({
      where: { id: lp.emailTemplateId },
      select: { id: true, subject: true, blocks: true },
    });
  }
  if (!template) {
    const t = await ensureTemplate();
    template = { id: t.id, subject: t.subject, blocks: t.blocks };
  }
  return { tagSlug, tagName, template, emailSubjectOverride, emailFooterJson };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const emailRaw = String(body.email || "").trim();
    const company = String(body.company || "").trim();
    const privacyAccepted = !!body.privacyAccepted;
    const inviteToken = body.inviteToken ? String(body.inviteToken).trim() : "";

    if (!firstName) return NextResponse.json({ success: false, error: "Nome obbligatorio" }, { status: 400 });
    if (!lastName) return NextResponse.json({ success: false, error: "Cognome obbligatorio" }, { status: 400 });
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }
    if (!privacyAccepted) {
      return NextResponse.json({ success: false, error: "Accettazione privacy richiesta" }, { status: 400 });
    }

    const email = emailRaw.toLowerCase();
    const { tagSlug, tagName, template, emailSubjectOverride, emailFooterJson } = await resolveConfig();

    // Lingua dell'utente (impostata dal middleware via x-gtv-lang header)
    const lang = (() => {
      try { return headers().get("x-gtv-lang") || "it"; } catch { return "it"; }
    })();

    // Save / update subscriber (con lingua)
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        ...(company && { company }),
        languageCode: lang,
        acceptsPrivacy: true,
      },
      create: {
        email,
        firstName,
        lastName,
        company: company || null,
        languageCode: lang,
        acceptsPrivacy: true,
        acceptsUpdates: false,
      },
    });

    // Assign segmentation tag (idempotent) — uses LandingPageConfig.tagSlug if set
    await assignTagBySlug(email, tagSlug, tagName).catch((e) => {
      console.error("Tag assignment failed:", e);
    });

    // Mark invitation as accepted (registered) when this submit comes from a tracked email
    if (inviteToken) {
      try {
        const invitation = await prisma.eventInvitation.findUnique({
          where: { token: inviteToken },
          select: { id: true, registeredAt: true, clickedAt: true },
        });
        if (invitation && !invitation.registeredAt) {
          await prisma.eventInvitation.update({
            where: { id: invitation.id },
            data: {
              registeredAt: new Date(),
              ...(invitation.clickedAt ? {} : { clickedAt: new Date() }),
            },
          });
        }
      } catch (e) {
        console.error("Invitation accept failed:", e);
      }
    }

    // Cerca traduzioni email per la lingua dell'utente (se non IT)
    let trEmailSubject = "";
    let trEmailTitle = "";
    let trEmailBody = "";
    if (lang !== "it") {
      try {
        const lp = await prisma.landingPageConfig.findUnique({
          where: { permalink: PERMALINK },
          select: { id: true },
        });
        if (lp) {
          const tr = await prisma.landingPageConfigTranslation.findUnique({
            where: { landingPageId_languageCode: { landingPageId: lp.id, languageCode: lang } },
            select: { emailSubject: true, emailTitle: true, emailBody: true },
          });
          trEmailSubject = (tr?.emailSubject || "").trim();
          trEmailTitle = (tr?.emailTitle || "").trim();
          trEmailBody = (tr?.emailBody || "").trim();
        }
      } catch { /* fallback su IT */ }
    }

    // Fire-and-forget confirmation email — do not block the response
    (async () => {
      try {
        let html: string;
        if (trEmailTitle || trEmailBody) {
          // Render email tradotta semplificata (no template blocks): titolo + corpo + footer
          const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const renderText = (s: string) =>
            escape(s)
              .replace(/\{\{firstName\}\}/g, escape(firstName))
              .replace(/\{\{lastName\}\}/g, escape(lastName))
              .replace(/\{\{email\}\}/g, escape(email))
              .replace(/\n/g, "<br/>");
          html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#333;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;max-width:600px;width:100%;">
<tr><td style="padding:32px 32px 8px 32px;font-size:24px;font-weight:600;color:#1a1a1a;">${renderText(trEmailTitle || "")}</td></tr>
<tr><td style="padding:8px 32px 32px 32px;font-size:15px;line-height:1.7;color:#333;">${renderText(trEmailBody || "")}</td></tr>
</table>
</td></tr></table>
</body></html>`;
        } else {
          // Fallback IT: usa il template a blocchi originale
          html = renderEmailTemplate(parseBlocks(template.blocks), {
            firstName,
            lastName,
            email,
            eventLink: "",
          });
        }

        // Inject configurable footer (social icons + lines) before </body>
        const footerHtml = buildEmailFooterHtml(getEmailFooterConfig(emailFooterJson));
        if (footerHtml) {
          html = html.includes("</body>")
            ? html.replace("</body>", `${footerHtml}</body>`)
            : html + footerHtml;
        }

        // Subject: traduzione > LandingPageConfig override > template subject > default
        const subject = trEmailSubject || emailSubjectOverride || template.subject || DEFAULT_SUBJECT;
        await sendMail(email, subject, html);
      } catch (e) {
        console.error("Confirmation email failed:", e);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Landing subscribe error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
