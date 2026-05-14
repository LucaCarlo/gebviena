import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/store/public/auth/setup-password
 * Body: { password: string }
 *
 * Setta la password iniziale del customer corrente (deve essere autenticato
 * via cookie — tipicamente arrivato qui da magic-link). Per cambiare una
 * password esistente usare /change-password (richiede vecchia password).
 */
export async function POST(req: Request) {
  try {
    const customer = await getAuthCustomer();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
    }

    // Se ha già una password, NON sovrascrivere senza la vecchia.
    const dbCustomer = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: { passwordHash: true },
    });
    if (dbCustomer?.passwordHash) {
      return NextResponse.json({
        success: false,
        error: "Password già impostata. Usa cambio password.",
      }, { status: 409 });
    }

    const body = await req.json();
    const password = String(body.password || "");
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: "La password deve avere almeno 8 caratteri",
      }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[setup-password] error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
