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
    const firstName = body.firstName ? String(body.firstName).trim() : null;
    const lastName = body.lastName ? String(body.lastName).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const language = body.language ? String(body.language) : "it";
    const marketingOptIn = !!body.marketingOptIn;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: "La password deve contenere almeno 8 caratteri" }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Email già registrata" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const customer = await prisma.customer.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        language,
        marketingOptIn,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const token = signCustomerToken({ customerId: customer.id, email: customer.email });
    const res = NextResponse.json({ success: true, data: customer });
    res.cookies.set(CUSTOMER_COOKIE_NAME, token, customerCookieOptions());
    return res;
  } catch (e) {
    console.error("Customer register error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
