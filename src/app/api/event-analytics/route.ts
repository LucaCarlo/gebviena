import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(req: Request) {
  const result = await requirePermission("newsletter", "view");
  if (isErrorResponse(result)) return result;

  const { searchParams } = new URL(req.url);
  const landingPageId = searchParams.get("landingPageId");

  try {
    // Build where clauses
    const invWhere = landingPageId ? { landingPageId } : {};
    const regWhere = landingPageId ? { landingPageId } : {};

    // 1. Invitations stats
    const invitations = await prisma.eventInvitation.findMany({
      where: invWhere,
      select: {
        id: true, email: true, sentAt: true, openedAt: true, clickedAt: true,
        registeredAt: true, registrationId: true, campaign: true,
        landingPageId: true,
        landingPage: { select: { name: true, permalink: true } },
      },
    });

    // 2. Registrations stats
    const registrations = await prisma.eventRegistration.findMany({
      where: regWhere,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        source: true, checkedIn: true, checkedInAt: true, createdAt: true,
        landingPageId: true,
      },
    });

    // 3. Landing pages
    const landingPages = await prisma.landingPageConfig.findMany({
      select: { id: true, name: true, permalink: true },
      orderBy: { createdAt: "desc" },
    });

    // ─── Global stats ───
    const totalInvited = invitations.length;
    const totalOpened = invitations.filter((i) => i.openedAt).length;
    const totalClicked = invitations.filter((i) => i.clickedAt).length;
    const totalRegisteredFromInvite = invitations.filter((i) => i.registeredAt).length;
    const totalRegistered = registrations.length;
    const totalCheckedIn = registrations.filter((r) => r.checkedIn).length;
    const totalDirect = registrations.filter((r) => r.source === "direct" || !r.source).length;

    const global = {
      totalInvited,
      totalOpened,
      totalClicked,
      totalRegistered,
      totalCheckedIn,
      registeredFromInvite: totalRegisteredFromInvite,
      registeredDirect: totalDirect,
      inviteToOpened: totalInvited > 0 ? totalOpened / totalInvited : 0,
      inviteToClicked: totalInvited > 0 ? totalClicked / totalInvited : 0,
      inviteToRegistered: totalInvited > 0 ? totalRegisteredFromInvite / totalInvited : 0,
      registeredToCheckedIn: totalRegistered > 0 ? totalCheckedIn / totalRegistered : 0,
      inviteToCheckedIn: totalInvited > 0 ? totalCheckedIn / totalInvited : 0,
    };

    // ─── By event ───
    const byEvent = landingPages.map((lp) => {
      const lpInv = invitations.filter((i) => i.landingPageId === lp.id);
      const lpReg = registrations.filter((r) => r.landingPageId === lp.id);
      const lpInvited = lpInv.length;
      const lpOpened = lpInv.filter((i) => i.openedAt).length;
      const lpClicked = lpInv.filter((i) => i.clickedAt).length;
      const lpRegFromInv = lpInv.filter((i) => i.registeredAt).length;
      const lpRegistered = lpReg.length;
      const lpCheckedIn = lpReg.filter((r) => r.checkedIn).length;

      return {
        landingPageId: lp.id,
        name: lp.name,
        permalink: lp.permalink,
        invited: lpInvited,
        opened: lpOpened,
        clicked: lpClicked,
        registered: lpRegistered,
        registeredFromInvite: lpRegFromInv,
        checkedIn: lpCheckedIn,
        inviteToOpened: lpInvited > 0 ? lpOpened / lpInvited : 0,
        inviteToRegistered: lpInvited > 0 ? lpRegFromInv / lpInvited : 0,
        registeredToCheckedIn: lpRegistered > 0 ? lpCheckedIn / lpRegistered : 0,
      };
    });

    // ─── Timeline (registration delay after invite) ───
    const delays = invitations
      .filter((i) => i.registeredAt && i.sentAt)
      .map((i) => (new Date(i.registeredAt!).getTime() - new Date(i.sentAt).getTime()) / 1000);

    const timeline = {
      within1h: delays.filter((d) => d < 3600).length,
      within24h: delays.filter((d) => d >= 3600 && d < 86400).length,
      within3d: delays.filter((d) => d >= 86400 && d < 259200).length,
      within7d: delays.filter((d) => d >= 259200 && d < 604800).length,
      after7d: delays.filter((d) => d >= 604800).length,
    };

    // ─── Status lists ───
    const registrationEmails = new Set(registrations.map((r) => r.email.toLowerCase()));
    const invitedEmails = new Set(invitations.map((i) => i.email.toLowerCase()));

    const invitedNotRegistered = invitations
      .filter((i) => !i.registeredAt && !registrationEmails.has(i.email.toLowerCase()))
      .map((i) => ({
        email: i.email, sentAt: i.sentAt.toISOString(),
        openedAt: i.openedAt?.toISOString() || null,
        clickedAt: i.clickedAt?.toISOString() || null,
        landingPageName: i.landingPage?.name || "—",
        campaign: i.campaign,
      }));

    const registeredNotCheckedIn = registrations
      .filter((r) => !r.checkedIn)
      .map((r) => ({
        email: r.email, name: `${r.firstName} ${r.lastName}`,
        source: r.source || "unknown",
        registeredAt: r.createdAt.toISOString(),
      }));

    const checkedIn = registrations
      .filter((r) => r.checkedIn)
      .map((r) => ({
        email: r.email, name: `${r.firstName} ${r.lastName}`,
        source: r.source || "unknown",
        checkedInAt: r.checkedInAt?.toISOString() || null,
        registeredAt: r.createdAt.toISOString(),
      }));

    const registeredWithoutInvite = registrations
      .filter((r) => (r.source === "direct" || !r.source) && !invitedEmails.has(r.email.toLowerCase()))
      .map((r) => ({
        email: r.email, name: `${r.firstName} ${r.lastName}`,
        registeredAt: r.createdAt.toISOString(),
      }));

    return NextResponse.json({
      success: true,
      data: {
        global,
        byEvent: byEvent.filter((e) => e.invited > 0 || e.registered > 0),
        timeline,
        statusList: {
          invitedNotRegistered,
          registeredNotCheckedIn,
          checkedIn,
          registeredWithoutInvite,
        },
        landingPages,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
