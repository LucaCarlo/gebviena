import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendContactNotification } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message, type, recaptchaToken, subscribeNewsletter } = body;

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
      data: { name, email, subject, message, type: type || "general" },
    });

    // Subscribe to newsletter if requested
    if (subscribeNewsletter) {
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {},
        create: { email },
      });
    }

    // Send email notification in background (don't await)
    sendContactNotification(name, email, subject, message, type || "general").catch((err) =>
      console.error("Failed to send contact notification:", err)
    );

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}

export async function GET() {
  const data = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data });
}
