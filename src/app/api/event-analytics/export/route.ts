import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(req: Request) {
  const result = await requirePermission("newsletter", "view");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const landingPageId = searchParams.get("landingPageId");

  try {
    const invWhere = landingPageId ? { landingPageId } : {};
    const regWhere = landingPageId ? { landingPageId } : {};

    let csv = "";
    const now = new Date().toISOString().split("T")[0];

    if (status === "invitedNotRegistered") {
      const invitations = await prisma.eventInvitation.findMany({
        where: { ...invWhere, registeredAt: null },
        include: { landingPage: { select: { name: true } } },
        orderBy: { sentAt: "desc" },
      });
      csv = "Email,Inviato il,Aperto il,Cliccato il,Evento,Campagna\n";
      csv += invitations.map((i) =>
        `"${i.email}","${i.sentAt.toISOString()}","${i.openedAt?.toISOString() || ""}","${i.clickedAt?.toISOString() || ""}","${i.landingPage?.name || ""}","${i.campaign || ""}"`
      ).join("\n");
    } else if (status === "registeredNotCheckedIn") {
      const regs = await prisma.eventRegistration.findMany({
        where: { ...regWhere, checkedIn: false },
        orderBy: { createdAt: "desc" },
      });
      csv = "Email,Nome,Cognome,Sorgente,Registrato il\n";
      csv += regs.map((r) =>
        `"${r.email}","${r.firstName}","${r.lastName}","${r.source || "unknown"}","${r.createdAt.toISOString()}"`
      ).join("\n");
    } else if (status === "checkedIn") {
      const regs = await prisma.eventRegistration.findMany({
        where: { ...regWhere, checkedIn: true },
        orderBy: { checkedInAt: "desc" },
      });
      csv = "Email,Nome,Cognome,Sorgente,Registrato il,Check-in il\n";
      csv += regs.map((r) =>
        `"${r.email}","${r.firstName}","${r.lastName}","${r.source || "unknown"}","${r.createdAt.toISOString()}","${r.checkedInAt?.toISOString() || ""}"`
      ).join("\n");
    } else {
      // All
      const [invitations, regs] = await Promise.all([
        prisma.eventInvitation.findMany({ where: invWhere, orderBy: { sentAt: "desc" } }),
        prisma.eventRegistration.findMany({ where: regWhere, orderBy: { createdAt: "desc" } }),
      ]);
      csv = "Tipo,Email,Nome,Sorgente,Inviato,Aperto,Cliccato,Registrato,Check-in\n";
      for (const i of invitations) {
        csv += `"Invito","${i.email}","","","${i.sentAt.toISOString()}","${i.openedAt?.toISOString() || ""}","${i.clickedAt?.toISOString() || ""}","${i.registeredAt?.toISOString() || ""}",""\n`;
      }
      for (const r of regs) {
        csv += `"Registrazione","${r.email}","${r.firstName} ${r.lastName}","${r.source || "unknown"}","","","","${r.createdAt.toISOString()}","${r.checkedIn ? r.checkedInAt?.toISOString() || "sì" : ""}"\n`;
      }
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${status}-${now}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
