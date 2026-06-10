import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/area-professionisti/notifications/unread-count
 *
 * Solo il conteggio delle notifiche non lette. Usato dall'header del sito
 * per mostrare il pallino rosso accanto a "AREA PROFESSIONISTI".
 *
 * Risposta:
 *   { success: true, unread: N }       se loggato
 *   { success: false, unread: 0 }      se non loggato (no 401: l'header
 *                                       lo chiama ad ogni navigazione, non
 *                                       deve sporcare la console).
 */
export async function GET() {
  const pro = await getAuthProfessional();
  if (!pro) return NextResponse.json({ success: false, unread: 0 });

  // Tot notifiche visibili (audience NULL o = role).
  const totalVisible = await prisma.professionalNotification.count({
    where: { OR: [{ audience: null }, { audience: pro.role }] },
  });
  const readCount = await prisma.professionalNotificationRead.count({
    where: {
      professionalId: pro.id,
      notification: { OR: [{ audience: null }, { audience: pro.role }] },
    },
  });
  const unread = Math.max(0, totalVisible - readCount);

  const res = NextResponse.json({ success: true, unread });
  // Cache 30s in browser per evitare hammer dell'header su ogni navigazione.
  res.headers.set("Cache-Control", "private, max-age=30");
  return res;
}
