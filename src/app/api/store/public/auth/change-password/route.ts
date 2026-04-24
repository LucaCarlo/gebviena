import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const current = await getAuthCustomer();
  if (!current) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || String(newPassword).length < 8) {
      return NextResponse.json({ success: false, error: "La nuova password deve avere almeno 8 caratteri" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: current.id } });
    if (!customer || !customer.passwordHash) {
      return NextResponse.json({ success: false, error: "Utente non valido" }, { status: 400 });
    }

    const valid = await bcrypt.compare(String(currentPassword || ""), customer.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Password attuale errata" }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await prisma.customer.update({ where: { id: current.id }, data: { passwordHash } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Change password error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
