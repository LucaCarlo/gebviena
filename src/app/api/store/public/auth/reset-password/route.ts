import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeLoginToken } from "@/lib/customer-magic-link";
import { signCustomerToken, CUSTOMER_COOKIE_NAME, customerCookieOptions } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/store/public/auth/reset-password
 * Body: { token: string, password: string }
 *
 * Consuma il token (purpose=password_reset, 1 utilizzo), aggiorna la
 * password del customer e fa il login (setta cookie).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token || "");
    const password = String(body.password || "");

    if (!token) {
      return NextResponse.json({ success: false, error: "Token mancante" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: "La password deve avere almeno 8 caratteri",
      }, { status: 400 });
    }

    const consumed = await consumeLoginToken(token);
    if (!consumed || consumed.purpose !== "password_reset") {
      return NextResponse.json({ success: false, error: "Link non valido o scaduto" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: consumed.customerId } });
    if (!customer || !customer.isActive) {
      return NextResponse.json({ success: false, error: "Account non disponibile" }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash, lastLoginAt: new Date() },
    });

    const jwt = signCustomerToken({ customerId: customer.id, email: customer.email });
    const res = NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
    res.cookies.set(CUSTOMER_COOKIE_NAME, jwt, customerCookieOptions());
    return res;
  } catch (e) {
    console.error("[reset-password] error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
