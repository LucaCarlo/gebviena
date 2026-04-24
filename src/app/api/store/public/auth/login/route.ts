import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signCustomerToken, CUSTOMER_COOKIE_NAME, customerCookieOptions } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Credenziali richieste" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer || !customer.passwordHash || !customer.isActive) {
      return NextResponse.json({ success: false, error: "Credenziali non valide" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Credenziali non valide" }, { status: 401 });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signCustomerToken({ customerId: customer.id, email: customer.email });
    const res = NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
    res.cookies.set(CUSTOMER_COOKIE_NAME, token, customerCookieOptions());
    return res;
  } catch (e) {
    console.error("Customer login error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
