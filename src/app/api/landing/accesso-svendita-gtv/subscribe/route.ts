import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { renderEmailTemplate, parseBlocks } from "@/lib/email-template-renderer";
import { assignTagBySlug } from "@/lib/tags";

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
 * Resolve the confirmation email template + tag from the LandingPageConfig
 * if present (so the admin can swap them without code changes), falling
 * back to the auto-bootstrap template when no config exists.
 */
async function resolveConfig() {
  const lp = await prisma.landingPageConfig.findUnique({
    where: { permalink: PERMALINK },
    select: { tagSlug: true, name: true, emailTemplateId: true },
  });
  const tagSlug = lp?.tagSlug || TAG_SLUG_FALLBACK;
  const tagName = lp?.name || TAG_NAME_FALLBACK;

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
  return { tagSlug, tagName, template };
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
    const { tagSlug, tagName, template } = await resolveConfig();

    // Save / update subscriber
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        ...(company && { company }),
        acceptsPrivacy: true,
      },
      create: {
        email,
        firstName,
        lastName,
        company: company || null,
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

    // Fire-and-forget confirmation email — do not block the response
    (async () => {
      try {
        const html = renderEmailTemplate(parseBlocks(template.blocks), {
          firstName,
          lastName,
          email,
          eventLink: "",
        });
        await sendMail(email, template.subject || DEFAULT_SUBJECT, html);
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
