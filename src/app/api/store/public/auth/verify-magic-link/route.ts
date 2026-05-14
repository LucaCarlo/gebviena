import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeLoginToken } from "@/lib/customer-magic-link";
import { signCustomerToken, CUSTOMER_COOKIE_NAME, customerCookieOptions } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/store/public/auth/verify-magic-link
 * Body: { token: string }
 *
 * Consuma 1 utilizzo del token (3 max per magic_link). Se valido:
 *   - setta il cookie di sessione customer
 *   - ritorna `needsPasswordSetup: true` se il customer non ha ancora una
 *     password — il client deve redirezionare a /account/setup-password.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token || "");
    if (!token) {
      return NextResponse.json({ success: false, error: "Token mancante" }, { status: 400 });
    }

    const consumed = await consumeLoginToken(token);
    if (!consumed) {
      return NextResponse.json({ success: false, error: "Link non valido o scaduto" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: consumed.customerId } });
    if (!customer || !customer.isActive) {
      return NextResponse.json({ success: false, error: "Account non disponibile" }, { status: 401 });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    const jwt = signCustomerToken({ customerId: customer.id, email: customer.email });
    const needsPasswordSetup = !customer.passwordHash;

    const res = NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        needsPasswordSetup,
        purpose: consumed.purpose,
      },
    });
    res.cookies.set(CUSTOMER_COOKIE_NAME, jwt, customerCookieOptions());
    return res;
  } catch (e) {
    console.error("[verify-magic-link] error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
