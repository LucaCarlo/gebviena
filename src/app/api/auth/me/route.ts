import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "Utente non trovato" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}
