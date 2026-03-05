import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptcha } from "@/lib/recaptcha";

export async function POST(req: Request) {
  try {
    const { email, firstName, lastName, company, phone, recaptchaToken, acceptsPrivacy, acceptsUpdates } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, error: "Email richiesta" }, { status: 400 });
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        return NextResponse.json({ success: false, error: "Verifica reCAPTCHA fallita" }, { status: 400 });
      }
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }),
        acceptsPrivacy: acceptsPrivacy ?? undefined,
        acceptsUpdates: acceptsUpdates ?? undefined,
      },
      create: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        acceptsPrivacy: acceptsPrivacy ?? false,
        acceptsUpdates: acceptsUpdates ?? false,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
