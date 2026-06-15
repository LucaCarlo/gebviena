import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signProfessionalToken, PROFESSIONAL_COOKIE_NAME, professionalCookieOptions } from "@/lib/professional-auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { normalizeEmail, isLikelyDotSpam, isLikelyGibberishName } from "@/lib/email-spam";
import type { ProfessionalRole } from "@prisma/client";

export const dynamic = "force-dynamic";

// Solo i ruoli self-service: chi imposta direttamente una password e accede subito.
// Rivenditori/Agenti devono passare per /api/professionals/request-access che
// li crea con pendingApproval=true (vedi flusso "richiesta accesso").
const VALID_ROLES = new Set(["ARCHITECT_DESIGNER", "PRESS"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const firstName = String(body.firstName || "").trim().slice(0, 128);
    const lastName = String(body.lastName || "").trim().slice(0, 128);
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim().slice(0, 32) || null;
    const company = String(body.company || "").trim().slice(0, 255);
    const role = String(body.role || "").toUpperCase();
    const password = String(body.password || "");
    const language = ["it", "fr", "en", "de", "es"].includes(String(body.language || "").toLowerCase())
      ? String(body.language).toLowerCase()
      : "it";
    const acceptsPrivacy = body.acceptsPrivacy === true;
    const marketingOptIn = body.marketingOptIn === true;

    // Validazioni base
    if (!firstName || !lastName || !rawEmail || !company || !role || !password) {
      return NextResponse.json({ success: false, error: "Campi obbligatori mancanti" }, { status: 400 });
    }
    if (!acceptsPrivacy) {
      return NextResponse.json({ success: false, error: "Devi accettare la privacy policy" }, { status: 400 });
    }
    if (!VALID_ROLES.has(role)) {
      // Per RESELLER/AGENT redirigiamo logicamente all'altro endpoint
      return NextResponse.json({ success: false, error: "Per questo ruolo è richiesta l'approvazione manuale. Usa il form di richiesta accesso." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }
    // Password: min 8, almeno una maiuscola, una minuscola, un numero
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ success: false, error: "Password troppo debole" }, { status: 400 });
    }

    // Anti-spam (gli stessi filtri usati nei form contatti)
    if (isLikelyDotSpam(rawEmail)) {
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }
    if (isLikelyGibberishName(firstName) || isLikelyGibberishName(lastName)) {
      return NextResponse.json({ success: false, error: "Nome non valido" }, { status: 400 });
    }

    // reCAPTCHA Enterprise (config in admin → Impostazioni sito → reCAPTCHA)
    const recaptchaToken = typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";
    const human = await verifyRecaptcha(recaptchaToken, "professional_register");
    if (!human) {
      return NextResponse.json({ success: false, error: "Verifica anti-bot fallita" }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);

    // Email già esistente?
    const exists = await prisma.professional.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      return NextResponse.json({ success: false, error: "Esiste già un account con questa email" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const pro = await prisma.professional.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        company,
        role: role as ProfessionalRole,
        language,
        acceptsPrivacy: true,
        marketingOptIn,
        lastLoginAt: new Date(),
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });

    // Auto-approvazione: setta subito la sessione → l'utente accede senza ulteriori passi.
    const token = signProfessionalToken({ professionalId: pro.id, email: pro.email, role: pro.role });
    const res = NextResponse.json({ success: true, data: { id: pro.id, firstName: pro.firstName } });
    res.cookies.set(PROFESSIONAL_COOKIE_NAME, token, professionalCookieOptions());
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[professionals/register] error:", msg);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
