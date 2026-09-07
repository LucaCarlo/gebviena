import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendContactNotification } from "@/lib/mail";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { sendCapiEvent } from "@/lib/fb-capi";
import { normalizeEmail, isLikelyDotSpam, isLikelyGibberishName } from "@/lib/email-spam";

// Indirizzo commerciale a cui inoltrare le richieste dalla pagina "Rete vendita"
// (form con storeId / type = "store_contact"), oltre allo store contattato.
const SALES_EMAIL = "sales@gebruederthonetvienna.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email: rawEmail, subject, message, type, company, phone, storeId, recaptchaToken, subscribeNewsletter, contactReason } = body;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const clientUserAgent = req.headers.get("user-agent") || null;

    if (!name || !rawEmail || !message) {
      return NextResponse.json({ success: false, error: "Campi obbligatori mancanti" }, { status: 400 });
    }

    // Anti-spam #1: pattern "Gmail dot abuse"
    if (isLikelyDotSpam(rawEmail)) {
      console.warn(`[contact] rifiutata email pattern spam: ${rawEmail}`);
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }

    // Anti-spam #1b: nome gibberish
    if (isLikelyGibberishName(name)) {
      console.warn(`[contact] rifiutato nome gibberish: ${name} <${rawEmail}>`);
      return NextResponse.json({ success: false, error: "Nome non valido" }, { status: 400 });
    }

    // Anti-spam #2: reCAPTCHA SEMPRE (no più bypassabile omettendo il token)
    const human = await verifyRecaptcha(recaptchaToken || "", "contact_submit");
    if (!human) {
      return NextResponse.json({ success: false, error: "Verifica anti-bot fallita" }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);

    // Create contact submission
    const data = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        subject,
        message,
        type: type || "general",
        company: company || null,
        phone: phone || null,
        storeId: storeId || null,
        contactReason: contactReason || null,
      },
    });

    // Subscribe to newsletter if requested
    if (subscribeNewsletter) {
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {},
        create: { email },
      });
    }

    // If store contact, send email to both store and admin
    // + CC sempre a SALES_EMAIL (per non perdere richieste di offerta dalla rete vendita)
    if (storeId) {
      const store = await prisma.pointOfSale.findUnique({ where: { id: storeId } });
      const storeLabel = store ? `${store.name}${store.city ? " — " + store.city : ""}` : "";
      const storeHtml = `
        <h2>Nuovo messaggio dal sito GTV — Rete vendita</h2>
        ${storeLabel ? `<p><strong>Punto vendita / Agente:</strong> ${storeLabel}</p>` : ""}
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${company ? `<p><strong>Azienda:</strong> ${company}</p>` : ""}
        ${phone ? `<p><strong>Telefono:</strong> ${phone}</p>` : ""}
        ${subject ? `<p><strong>Oggetto:</strong> ${subject}</p>` : ""}
        ${contactReason ? `<p><strong>Motivo del contatto:</strong> ${contactReason}</p>` : ""}
        <p><strong>Messaggio:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `;
      const subjectLine = `[GTV] ${storeLabel ? storeLabel + " — " : ""}Nuovo messaggio da ${name}`;
      const { sendMail } = await import("@/lib/mail");
      // 1) allo store (se ha un indirizzo email configurato)
      if (store?.email) {
        sendMail(store.email, subjectLine, storeHtml).catch((err) =>
          console.error("Failed to send store email:", err)
        );
      }
      // 2) sempre a SALES_EMAIL — anche quando lo store non ha email o l'admin
      //    non guarda la dashboard: cosi' le richieste di offerta non si perdono.
      //    Evito duplicato se lo store e' proprio l'indirizzo sales.
      if (!store?.email || store.email.trim().toLowerCase() !== SALES_EMAIL.toLowerCase()) {
        sendMail(SALES_EMAIL, subjectLine, storeHtml).catch((err) =>
          console.error("Failed to send sales notification:", err)
        );
      }
    }

    // Send email notification to admin in background
    sendContactNotification(name, email, subject, message, type || "general").catch((err) =>
      console.error("Failed to send contact notification:", err)
    );

    // Meta CAPI: invia Lead server-side (event_id condiviso col pixel client = `lead-${id}`).
    // Estrazione naming: il form passa "name" come stringa unica → split su primo spazio.
    const [firstName, ...rest] = (name || "").trim().split(/\s+/);
    const lastName = rest.join(" ") || null;
    sendCapiEvent({
      eventName: "Lead",
      eventId: `lead-${data.id}`,
      actionSource: "website",
      userData: {
        email,
        phone: phone || null,
        firstName: firstName || null,
        lastName,
        clientIp,
        clientUserAgent,
      },
      customData: {
        content_name: type || "general",
        content_category: "contact_form",
      },
    }).catch((err) => console.error("[contact] sendCapiEvent Lead error:", err));

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}

export async function GET() {
  const result = await requirePermission("contacts", "view");
  if (isErrorResponse(result)) return result;

  const rows = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });
  // Se c'e' storeId, arricchisce con dati dal PointOfSale (nome negozio / agente, citta, tipo)
  const storeIds = Array.from(new Set(rows.map((r) => r.storeId).filter((x): x is string => !!x)));
  const storesMap = new Map<string, { name: string; agentName: string | null; city: string; type: string }>();
  if (storeIds.length > 0) {
    const stores = await prisma.pointOfSale.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true, agentName: true, city: true, type: true },
    });
    for (const st of stores) storesMap.set(st.id, { name: st.name, agentName: st.agentName, city: st.city, type: st.type });
  }
  const data = rows.map((r) => {
    const st = r.storeId ? storesMap.get(r.storeId) : null;
    return {
      ...r,
      storeName: st?.name ?? null,
      storeAgentName: st?.agentName ?? null,
      storeCity: st?.city ?? null,
      storeType: st?.type ?? null,
    };
  });
  return NextResponse.json({ success: true, data });
}
