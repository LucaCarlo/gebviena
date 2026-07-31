import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { invalidateBlocklistCache } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET: lista IP bloccati (paginata, ordinamento più recenti prima)
export async function GET(req: NextRequest) {
  const authErr = await requirePermission("settings", "view");
  if (isErrorResponse(authErr)) return authErr;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(500, Math.max(10, Number(searchParams.get("limit")) || 100));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const [items, total] = await Promise.all([
    prisma.blockedIp.findMany({
      orderBy: { blockedAt: "desc" },
      take: limit,
      skip: offset,
      select: { id: true, ipHash: true, reason: true, autoBanned: true, blockedAt: true, expiresAt: true, notes: true },
    }),
    prisma.blockedIp.count(),
  ]);
  return NextResponse.json({ success: true, data: { items, total, limit, offset } });
}

// POST: aggiungi/aggiorna un IP alla blocklist manualmente
export async function POST(req: NextRequest) {
  const authErr = await requirePermission("settings", "edit");
  if (isErrorResponse(authErr)) return authErr;
  const body = (await req.json().catch(() => null)) as {
    ipHash?: string;
    reason?: string;
    expiresAt?: string | null;
    notes?: string;
  } | null;
  if (!body?.ipHash || body.ipHash.length < 10) {
    return NextResponse.json({ success: false, error: "ipHash mancante o invalido" }, { status: 400 });
  }
  const ipHash = String(body.ipHash).slice(0, 64);
  const reason = String(body.reason || "Blocco manuale admin").slice(0, 255);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const notes = body.notes ? String(body.notes).slice(0, 1000) : null;
  const item = await prisma.blockedIp.upsert({
    where: { ipHash },
    create: { ipHash, reason, autoBanned: false, expiresAt, notes },
    update: { reason, autoBanned: false, expiresAt, notes, blockedAt: new Date() },
  });
  invalidateBlocklistCache();
  return NextResponse.json({ success: true, data: item });
}
