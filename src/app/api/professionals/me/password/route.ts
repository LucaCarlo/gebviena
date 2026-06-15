import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";

export const dynamic = "force-dynamic";

/**
 * POST — cambio password del professionista loggato.
 * Body: { currentPassword, newPassword }
 * Validazione minima sulla nuova: 8 char, A/a/numero (uguale al register).
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthProfessional();
  if (!auth) return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ success: false, error: "Compila tutti i campi" }, { status: 400 });
  }
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return NextResponse.json({ success: false, error: "Password troppo debole: minimo 8 caratteri, con maiuscola, minuscola e numero" }, { status: 400 });
  }

  // Rileggo dal DB per avere passwordHash (l'oggetto auth non lo include).
  const pro = await prisma.professional.findUnique({
    where: { id: auth.id },
    select: { id: true, passwordHash: true },
  });
  if (!pro || !pro.passwordHash) {
    return NextResponse.json({ success: false, error: "Account non valido" }, { status: 400 });
  }

  const ok = await bcrypt.compare(currentPassword, pro.passwordHash);
  if (!ok) {
    return NextResponse.json({ success: false, error: "Password attuale non corretta" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.professional.update({
    where: { id: pro.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true });
}
