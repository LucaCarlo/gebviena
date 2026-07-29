import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/professionals/reset-password
 * Body: { token, password }
 * Verifica token + scadenza → aggiorna passwordHash → invalida token.
 */
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "Token mancante" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "La password deve essere di almeno 8 caratteri" },
        { status: 400 }
      );
    }

    const pro = await prisma.professional.findFirst({
      where: { passwordResetToken: token },
    });

    if (!pro) {
      return NextResponse.json(
        { success: false, error: "Token non valido o già usato" },
        { status: 400 }
      );
    }

    if (!pro.passwordResetExpires || pro.passwordResetExpires < new Date()) {
      return NextResponse.json(
        { success: false, error: "Token scaduto — richiedi un nuovo link" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    await prisma.professional.update({
      where: { id: pro.id },
      data: {
        passwordHash: hash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[reset-password]", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
