import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ success: false, error: "Token mancante" }, { status: 400 });
  }

  try {
    const invitation = await prisma.eventInvitation.findUnique({
      where: { token },
      select: { id: true, email: true, landingPageId: true, clickedAt: true },
    });

    if (!invitation) {
      return NextResponse.json({ success: false, error: "Token non valido" }, { status: 404 });
    }

    // Mark as clicked if not already
    if (!invitation.clickedAt) {
      await prisma.eventInvitation.update({
        where: { id: invitation.id },
        data: { clickedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: invitation.email,
        landingPageId: invitation.landingPageId,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
