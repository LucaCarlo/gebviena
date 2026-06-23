import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { normalizeEmail, isLikelyDotSpam, isLikelyGibberishName } from "@/lib/email-spam";
import { notifyAdminNewRequest } from "@/lib/professional-email";
import { COUNTRIES } from "@/lib/countries";
import type { ProfessionalRole } from "@prisma/client";

export const dynamic = "force-dynamic";

// Solo i ruoli "request-only": rivenditori e agenti.
// Architetti e stampa usano /register (self-service con password).
const VALID_REQUEST_ROLES = new Set(["RESELLER", "AGENT"]);

/**
 * Richiesta di accesso area professionisti per Rivenditori e Agenti.
 * NON imposta una password: l'admin approva manualmente e a quel punto
 * il sistema genera credenziali e le invia via email.
 *
 * Crea il record con pendingApproval=true e passwordHash="". Login bloccato
 * finché l'approve endpoint non aggiorna il record.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const firstName = String(body.firstName || "").trim().slice(0, 128);
    const lastName  = String(body.lastName  || "").trim().slice(0, 128);
    const rawEmail  = String(body.email     || "").trim().toLowerCase();
    const company   = String(body.company   || "").trim().slice(0, 255);
    const phone     = String(body.phone     || "").trim().slice(0, 32) || null;
    const role      = String(body.role      || "").toUpperCase();
    const language  = ["it", "fr", "en", "de", "es"].includes(String(body.language || "").toLowerCase())
      ? String(body.language).toLowerCase()
      : "it";
    const acceptsPrivacy = body.acceptsPrivacy === true;
    const marketingOptIn = body.marketingOptIn === true;
    const country = String(body.country || "").toUpperCase().slice(0, 2);

    if (!firstName || !lastName || !rawEmail || !company || !role) {
      return NextResponse.json({ success: false, error: "Campi obbligatori mancanti" }, { status: 400 });
    }
    if (!country || !COUNTRIES.some((c) => c.code === country)) {
      return NextResponse.json({ success: false, error: "Paese non valido" }, { status: 400 });
    }
    if (!acceptsPrivacy) {
      return NextResponse.json({ success: false, error: "Devi accettare la privacy policy" }, { status: 400 });
    }
    if (!VALID_REQUEST_ROLES.has(role)) {
      return NextResponse.json({ success: false, error: "Ruolo non valido per richiesta accesso" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }

    // Anti-spam (gli stessi filtri usati negli altri form)
    if (isLikelyDotSpam(rawEmail)) {
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }
    if (isLikelyGibberishName(firstName) || isLikelyGibberishName(lastName)) {
      return NextResponse.json({ success: false, error: "Nome non valido" }, { status: 400 });
    }

    const recaptchaToken = typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";
    const human = await verifyRecaptcha(recaptchaToken, "professional_request_access");
    if (!human) {
      return NextResponse.json({ success: false, error: "Verifica anti-bot fallita" }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);

    // Email già esistente?
    const exists = await prisma.professional.findUnique({ where: { email }, select: { id: true, pendingApproval: true } });
    if (exists) {
      return NextResponse.json({
        success: false,
        error: exists.pendingApproval
          ? "Hai già una richiesta in attesa di approvazione con questa email"
          : "Esiste già un account con questa email",
      }, { status: 409 });
    }

    const pro = await prisma.professional.create({
      data: {
        email,
        passwordHash: "", // sarà generato all'approve
        firstName,
        lastName,
        phone,
        company,
        role: role as ProfessionalRole,
        language,
        country,
        acceptsPrivacy: true,
        marketingOptIn,
        pendingApproval: true,
        isActive: false, // non può loggare finché non approvato
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, role: true, language: true },
    });

    // Notifica admin (fire-and-forget, non blocca la response)
    notifyAdminNewRequest(pro).catch((err) =>
      console.error("[request-access] notifyAdminNewRequest failed:", err)
    );

    return NextResponse.json({ success: true, data: { id: pro.id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[professionals/request-access] error:", msg);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
