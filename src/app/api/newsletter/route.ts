import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { assignTagBySlug } from "@/lib/tags";
import { normalizeEmail, isLikelyDotSpam, isLikelyGibberishName } from "@/lib/email-spam";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, firstName, lastName, company, phone, recaptchaToken, acceptsPrivacy, acceptsUpdates } = await req.json();
    if (!rawEmail) {
      return NextResponse.json({ success: false, error: "Email richiesta" }, { status: 400 });
    }

    // Anti-spam #1: pattern "Gmail dot abuse" (a.b.c.d.e@gmail.com) — reject senza scrivere in DB
    if (isLikelyDotSpam(rawEmail)) {
      console.warn(`[newsletter] rifiutata email pattern spam: ${rawEmail}`);
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }

    // Anti-spam #1b: nomi gibberish tipo "KMzEvVeXjFvVhIQrNRM"
    if (isLikelyGibberishName(firstName) || isLikelyGibberishName(lastName)) {
      console.warn(`[newsletter] rifiutato nome gibberish: ${firstName} ${lastName} <${rawEmail}>`);
      return NextResponse.json({ success: false, error: "Nome non valido" }, { status: 400 });
    }

    // Anti-spam #2: reCAPTCHA SEMPRE (no più "if (recaptchaToken)" bypassabile).
    // verifyRecaptcha è fail-open su errori API ma fail-closed su token assente.
    const human = await verifyRecaptcha(recaptchaToken || "", "newsletter_subscribe");
    if (!human) {
      return NextResponse.json({ success: false, error: "Verifica anti-bot fallita" }, { status: 400 });
    }

    // Canonicalizzazione email (Gmail: niente punti, niente "+tag")
    const email = normalizeEmail(rawEmail);

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

    // Auto-assign "newsletter" tag (usa email canonica)
    assignTagBySlug(email, "newsletter", "Newsletter").catch(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
