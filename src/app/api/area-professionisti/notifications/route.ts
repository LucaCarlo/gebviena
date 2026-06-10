import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/area-professionisti/notifications
 *   Lista paginata delle notifiche destinate al professionista loggato, con
 *   stato letto/non-letto. Filtra per audience = NULL o = role del prof.
 *
 * Query: ?limit=50 (default 50, max 200)
 *
 * Risposta:
 *   { success, data: { items: [{...notification, isRead, readAt?}], unreadCount } }
 */
export async function GET(req: NextRequest) {
  const pro = await getAuthProfessional();
  if (!pro) return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 1), 200);

  // Notifiche visibili a questo professionista (audience NULL OR matching role).
  const items = await prisma.professionalNotification.findMany({
    where: { OR: [{ audience: null }, { audience: pro.role }] },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Stato letto/non-letto per ognuna
  const reads = items.length
    ? await prisma.professionalNotificationRead.findMany({
        where: { professionalId: pro.id, notificationId: { in: items.map((n) => n.id) } },
        select: { notificationId: true, readAt: true },
      })
    : [];
  const readMap = new Map(reads.map((r) => [r.notificationId, r.readAt]));

  const data = items.map((n) => ({
    ...n,
    isRead: readMap.has(n.id),
    readAt: readMap.get(n.id) || null,
  }));
  const unreadCount = data.filter((n) => !n.isRead).length;

  return NextResponse.json({ success: true, data: { items: data, unreadCount } });
}
