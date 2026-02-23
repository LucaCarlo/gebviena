import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Credenziali richieste" }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Credenziali non valide" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Credenziali non valide" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, email: user.email });

    const isSecure = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https") ?? false;
    const response = NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
