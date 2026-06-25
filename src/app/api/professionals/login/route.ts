import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signProfessionalToken, PROFESSIONAL_COOKIE_NAME, professionalCookieOptions } from "@/lib/professional-auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { normalizeEmail } from "@/lib/email-spam";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!rawEmail || !password) {
      return NextResponse.json({ success: false, error: "Email e password obbligatorie" }, { status: 400 });
    }

    // reCAPTCHA in modalità "soft" per il login: lo verifichiamo SOLO per
    // metterne il risultato nei log (utile per identificare attacchi). NON
    // blocchiamo l'utente in caso di fallimento — perché la password sbagliata
    // gia di per se blocca i bot (bcrypt rende brute-force impraticabile) e
    // utenti reali con adblock/estensioni/network restrittivo non riescono a
    // generare un token valido e finirebbero bloccati dal login del proprio
    // account. Per registrazione/contatti il reCAPTCHA resta strict (vedi
    // request-access/register/route.ts).
    const recaptchaToken = typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";
    const human = await verifyRecaptcha(recaptchaToken, "professional_login");
    if (!human) {
      console.warn(`[professionals/login] recaptcha FAIL per ${rawEmail} — procedo comunque (modalita soft, password verificata sotto)`);
    }

    const email = normalizeEmail(rawEmail);
    const pro = await prisma.professional.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true, isActive: true, pendingApproval: true, language: true },
    });

    if (!pro) {
      return NextResponse.json({ success: false, error: "Email o password errati" }, { status: 401 });
    }
    if (pro.pendingApproval) {
      return NextResponse.json({ success: false, error: "La tua richiesta è in attesa di approvazione. Riceverai un'email appena sarà approvata." }, { status: 403 });
    }
    if (!pro.isActive) {
      return NextResponse.json({ success: false, error: "Account disattivato. Contatta GTV." }, { status: 403 });
    }
    if (!pro.passwordHash) {
      return NextResponse.json({ success: false, error: "Account non ancora attivo. Contatta GTV." }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, pro.passwordHash);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Email o password errati" }, { status: 401 });
    }

    prisma.professional.update({ where: { id: pro.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

    const token = signProfessionalToken({ professionalId: pro.id, email: pro.email, role: pro.role });
    const res = NextResponse.json({ success: true, language: pro.language || "it" });
    res.cookies.set(PROFESSIONAL_COOKIE_NAME, token, professionalCookieOptions());
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[professionals/login] error:", msg);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
