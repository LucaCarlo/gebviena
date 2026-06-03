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

    // reCAPTCHA
    const recaptchaToken = typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";
    const human = await verifyRecaptcha(recaptchaToken, "professional_login");
    if (!human) {
      return NextResponse.json({ success: false, error: "Verifica anti-bot fallita" }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);
    const pro = await prisma.professional.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true, isActive: true },
    });

    // Errore generico per non rivelare se l'account esiste (anti-enumeration).
    if (!pro) {
      return NextResponse.json({ success: false, error: "Email o password errati" }, { status: 401 });
    }
    if (!pro.isActive) {
      return NextResponse.json({ success: false, error: "Account disattivato. Contatta GTV." }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, pro.passwordHash);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Email o password errati" }, { status: 401 });
    }

    // Aggiorna last login (best-effort, non blocca il flusso).
    prisma.professional.update({ where: { id: pro.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

    const token = signProfessionalToken({ professionalId: pro.id, email: pro.email, role: pro.role });
    const res = NextResponse.json({ success: true });
    res.cookies.set(PROFESSIONAL_COOKIE_NAME, token, professionalCookieOptions());
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[professionals/login] error:", msg);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
