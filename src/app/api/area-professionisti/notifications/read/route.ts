import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthProfessional } from "@/lib/professional-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/area-professionisti/notifications/read
 *
 * Body:
 *   { ids: ["..."], }       marca le notifiche elencate come lette
 *   { all: true }           marca tutte le notifiche visibili come lette
 */
export async function POST(req: NextRequest) {
  const pro = await getAuthProfessional();
  if (!pro) return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const all = body?.all === true;
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];

  let targets: { id: string }[] = [];
  if (all) {
    targets = await prisma.professionalNotification.findMany({
      where: { OR: [{ audience: null }, { audience: pro.role }] },
      select: { id: true },
    });
  } else if (ids.length > 0) {
    targets = await prisma.professionalNotification.findMany({
      where: {
        id: { in: ids },
        OR: [{ audience: null }, { audience: pro.role }],
      },
      select: { id: true },
    });
  }
  if (targets.length === 0) return NextResponse.json({ success: true, marked: 0 });

  // Upsert delle read in batch — usiamo createMany con skipDuplicates per
  // efficienza, lo unique (professionalId, notificationId) gestisce duplicati.
  await prisma.professionalNotificationRead.createMany({
    data: targets.map((t) => ({ professionalId: pro.id, notificationId: t.id })),
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true, marked: targets.length });
}
