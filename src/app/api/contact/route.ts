import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendContactNotification } from "@/lib/mail";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { sendCapiEvent } from "@/lib/fb-capi";
import { normalizeEmail, isLikelyDotSpam, isLikelyGibberishName } from "@/lib/email-spam";

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
    if (storeId) {
      const store = await prisma.pointOfSale.findUnique({ where: { id: storeId } });
      if (store?.email) {
        const { sendMail } = await import("@/lib/mail");
        const storeHtml = `
          <h2>Nuovo messaggio dal sito GTV</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${company ? `<p><strong>Azienda:</strong> ${company}</p>` : ""}
          ${phone ? `<p><strong>Telefono:</strong> ${phone}</p>` : ""}
          <p><strong>Messaggio:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `;
        sendMail(store.email, `[GTV] Nuovo messaggio da ${name}`, storeHtml).catch((err) =>
          console.error("Failed to send store email:", err)
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

  const data = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data });
}
