import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendContactNotification } from "@/lib/mail";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message, type, company, phone, storeId, recaptchaToken, subscribeNewsletter, contactReason } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: "Campi obbligatori mancanti" }, { status: 400 });
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        return NextResponse.json({ success: false, error: "Verifica reCAPTCHA fallita" }, { status: 400 });
      }
    }

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
