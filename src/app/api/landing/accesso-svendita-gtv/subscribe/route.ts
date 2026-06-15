import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMailResult } from "@/lib/mail";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";
import { assignTagBySlug } from "@/lib/tags";
import { buildEmailFooterHtml, getEmailFooterConfig } from "@/lib/event-registration";
import { headers } from "next/headers";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { isLikelyDotSpam, isLikelyGibberishName, normalizeEmail } from "@/lib/email-spam";

const TEMPLATE_NAME = "Conferma pre-accesso svendita";
// Permalink possibili della landing svendita: il vecchio era "accesso-svendita-gtv",
// l'admin lo ha cambiato in "accesso-vendita-speciale-gtv". Cerchiamo per tagSlug
// (stabile) con OR sui permalink come fallback, così cambi futuri non rompono l'API.
const PERMALINK_CANDIDATES = ["accesso-svendita-gtv", "accesso-vendita-speciale-gtv"];
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
 * (admin-editable: subject, template, footer, tag).
 * Per la lingua dell'utente (lang), se esiste una LandingPageConfigTranslation
 * con emailTemplateId/emailSubject popolato, quei valori hanno precedenza sul
 * default IT. Falla back all'auto-bootstrap template quando manca tutto.
 */
async function resolveConfig(lang: string) {
  // Identifichiamo la landing svendita in modo robusto: prima per tagSlug (stabile),
  // poi per permalink corrente o storico (backward compat).
  const lp = await prisma.landingPageConfig.findFirst({
    where: {
      OR: [
        { tagSlug: TAG_SLUG_FALLBACK },
        { permalink: { in: PERMALINK_CANDIDATES } },
      ],
    },
    select: { id: true, tagSlug: true, name: true, emailTemplateId: true, emailSubject: true, emailFooter: true },
  });
  const tagSlug = lp?.tagSlug || TAG_SLUG_FALLBACK;
  const tagName = lp?.name || TAG_NAME_FALLBACK;
  const emailFooterJson = lp?.emailFooter || null;

  // Override per lingua: cerca la translation della lingua corrente
  let trTemplateId: string | null = null;
  let trEmailSubject = "";
  let trEmailTitle = "";
  let trEmailBody = "";
  if (lp && lang !== "it") {
    try {
      const tr = await prisma.landingPageConfigTranslation.findUnique({
        where: { landingPageId_languageCode: { landingPageId: lp.id, languageCode: lang } },
        select: { emailTemplateId: true, emailSubject: true, emailTitle: true, emailBody: true },
      });
      trTemplateId = tr?.emailTemplateId?.trim() || null;
      trEmailSubject = (tr?.emailSubject || "").trim();
      trEmailTitle = (tr?.emailTitle || "").trim();
      trEmailBody = (tr?.emailBody || "").trim();
    } catch { /* fallback IT */ }
  }

  // Decidi l'ID del template da caricare: traduzione > default IT
  const targetTemplateId = trTemplateId || lp?.emailTemplateId || null;
  const emailSubjectOverride = trEmailSubject || lp?.emailSubject?.trim() || "";

  let template: { id: string; subject: string; blocks: string } | null = null;
  if (targetTemplateId) {
    template = await prisma.emailTemplate.findUnique({
      where: { id: targetTemplateId },
      select: { id: true, subject: true, blocks: true },
    });
  }
  if (!template) {
    const t = await ensureTemplate();
    template = { id: t.id, subject: t.subject, blocks: t.blocks };
  }
  return { tagSlug, tagName, template, emailSubjectOverride, emailFooterJson, trEmailTitle, trEmailBody };
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

    // Anti-spam #1: pattern "Gmail dot abuse" (a.b.c.d.e@gmail.com bot)
    if (isLikelyDotSpam(emailRaw)) {
      console.warn(`[landing svendita] rifiutata email pattern spam: ${emailRaw}`);
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }
    // Anti-spam #1b: nomi gibberish tipo "MCiHydzzzDbehOtCJpVJtq" (consonanti
    // casuali senza vocali / pattern entropico). reCAPTCHA da solo non basta
    // perché alcuni bot generano token validi con score sopra soglia.
    if (isLikelyGibberishName(firstName) || isLikelyGibberishName(lastName)) {
      console.warn(`[landing svendita] rifiutato nome gibberish: ${firstName} ${lastName} <${emailRaw}>`);
      return NextResponse.json({ success: false, error: "Nome non valido" }, { status: 400 });
    }

    // Anti-bot: reCAPTCHA Enterprise. verifyRecaptcha è "graceful":
    // se reCAPTCHA non è configurato/abilitato o l'API Google fallisce
    // → ritorna true (non blocca utenti reali). Blocca solo token
    // invalidi / punteggio sotto soglia quando è attivo.
    const recaptchaToken = typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";
    const human = await verifyRecaptcha(recaptchaToken, "landing_svendita_subscribe");
    if (!human) {
      return NextResponse.json({ success: false, error: "Verifica anti-bot non superata. Riprova." }, { status: 400 });
    }

    // Canonicalizza email (Gmail dot/+tag dedup → stessa entità lato DB).
    const email = normalizeEmail(emailRaw);

    // IP del visitatore dal reverse-proxy (nginx). x-forwarded-for può essere
    // "client, proxy1, proxy2": prendiamo il primo. Fallback x-real-ip.
    const clientIp = (() => {
      try {
        const h = headers();
        const xff = (h.get("x-forwarded-for") || "").split(",")[0].trim();
        return xff || (h.get("x-real-ip") || "").trim() || "";
      } catch { return ""; }
    })();
    const isPublicIp = clientIp && !/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc00:|fe80:)/.test(clientIp);

    // Lingua dell'utente: il middleware skippa /api/* quindi NON setta l'header
    // qui. Il client passa esplicitamente `lang` nel body (oppure header
    // x-gtv-lang). Fallback "it".
    const bodyLang = typeof body.lang === "string" ? body.lang.trim().toLowerCase() : "";
    const headerLang = (() => {
      try { return (headers().get("x-gtv-lang") || "").toLowerCase(); } catch { return ""; }
    })();
    // Sulla landing svendita ammettiamo solo IT/FR. Qualunque altra lingua
    // dal client (de/en/es/…) viene forzata a IT in fase di iscrizione.
    const KNOWN = new Set(["it", "fr"]);
    const candidate = bodyLang || headerLang;
    const lang = KNOWN.has(candidate) ? candidate : "it";

    const { tagSlug, tagName, template, emailSubjectOverride, emailFooterJson, trEmailTitle, trEmailBody } = await resolveConfig(lang);

    // Save / update subscriber (con lingua)
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        ...(company && { company }),
        languageCode: lang,
        acceptsPrivacy: true,
        ...(clientIp && { ipAddress: clientIp }),
      },
      create: {
        email,
        firstName,
        lastName,
        company: company || null,
        languageCode: lang,
        acceptsPrivacy: true,
        acceptsUpdates: false,
        ipAddress: clientIp || null,
      },
    });

    // Geolocalizzazione IP → città/regione/paese. Fire-and-forget: non blocca
    // né fa fallire l'iscrizione. Usa ip-api.com (free, no key).
    if (isPublicIp) {
      (async () => {
        try {
          const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(clientIp)}?fields=status,country,regionName,city`);
          const g = await r.json();
          if (g && g.status === "success") {
            await prisma.newsletterSubscriber.update({
              where: { email },
              data: {
                geoCity: g.city || null,
                geoRegion: g.regionName || null,
                geoCountry: g.country || null,
                geoAt: new Date(),
              },
            });
          }
        } catch (e) {
          console.error("GeoIP lookup failed:", e);
        }
      })();
    }

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

    // Fire-and-forget confirmation email — do not block the response
    (async () => {
      try {
        // Render priorità:
        // 1. Se la lingua ha un EmailTemplate dedicato (template caricato in resolveConfig) → usa quello
        // 2. Se la lingua ha solo title/body tradotti → renderizza email semplificata
        // 3. Altrimenti → template IT a blocchi (fallback)
        let html: string;
        if (trEmailTitle || trEmailBody) {
          // Email tradotta inline (quando l'admin non ha scelto un template per questa lingua ma ha compilato i campi text)
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
          // Template a blocchi (IT default oppure template specifico della lingua scelto in resolveConfig)
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

        // Subject: override (traduzione + IT) > template subject > default
        const subject = emailSubjectOverride || template.subject || DEFAULT_SUBJECT;
        const r = await sendMailResult(email, subject, html);
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: {
            emailStatus: r.ok ? "sent" : "error",
            emailError: r.ok ? null : (r.error || "Errore sconosciuto").slice(0, 400),
            emailSentAt: new Date(),
          },
        }).catch((e) => console.error("update emailStatus failed:", e));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Confirmation email failed:", e);
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: { emailStatus: "error", emailError: msg.slice(0, 400), emailSentAt: new Date() },
        }).catch(() => {});
      }
    })();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Landing subscribe error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
