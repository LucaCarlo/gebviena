import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const current = await getAuthCustomer();
  if (!current) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.firstName !== undefined) data.firstName = body.firstName ? String(body.firstName).trim() : null;
    if (body.lastName !== undefined) data.lastName = body.lastName ? String(body.lastName).trim() : null;
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
    if (body.language !== undefined) data.language = String(body.language);
    if (body.marketingOptIn !== undefined) data.marketingOptIn = !!body.marketingOptIn;

    const updated = await prisma.customer.update({
      where: { id: current.id },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, language: true, marketingOptIn: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("Update profile error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
