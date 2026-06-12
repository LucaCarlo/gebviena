import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { computeDaySnapshot, persistDaySnapshot, dayKey, dayBounds } from "@/lib/store-stats-snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min: il backfill iniziale può richiedere tempo

/**
 * POST /api/admin/store/stats/snapshot-backfill
 * Calcola e salva gli snapshot giornalieri per tutti i giorni passati
 * (esclude oggi). Idempotente: ?force=1 ricalcola anche giorni già presenti.
 *
 * Body opzionale: { from: "YYYY-MM-DD" } per restringere.
 * Query: ?force=1 per sovrascrivere snapshot esistenti.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission("store_orders", "view");
  if (isErrorResponse(auth)) return auth;

  const force = req.nextUrl.searchParams.get("force") === "1";

  // Determina il giorno di inizio: il più vecchio tra prima Order e prima PageView dello store
  const [oldestOrder, oldestPv] = await Promise.all([
    prisma.order.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.$queryRaw<{ d: Date }[]>`SELECT MIN(createdAt) AS d FROM PageView WHERE host = 'STORE'`,
  ]);
  const oldestPvDate = oldestPv?.[0]?.d ? new Date(oldestPv[0].d) : null;
  let bodyFrom: Date | null = null;
  try {
    const body = await req.json().catch(() => null);
    if (body?.from) {
      const d = new Date(body.from);
      if (Number.isFinite(d.getTime())) bodyFrom = d;
    }
  } catch { /* no body */ }

  const candidates = [bodyFrom, oldestOrder?.createdAt, oldestPvDate].filter(Boolean) as Date[];
  if (candidates.length === 0) {
    return NextResponse.json({ success: true, computed: 0, message: "Nessun dato storico" });
  }
  // Usa il MAX tra (bodyFrom se passato, altrimenti MIN delle date trovate)
  const startDate = bodyFrom || new Date(Math.min(...candidates.map((d) => d.getTime())));
  const startDay = dayBounds(startDate).from;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Build list of days [startDay .. today-1]
  const days: Date[] = [];
  const cursor = new Date(startDay);
  while (cursor < today) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Skip esistenti se !force
  let toCompute = days;
  if (!force) {
    const existing = await prisma.storeStatsDaySnapshot.findMany({
      where: { day: { in: days } },
      select: { day: true },
    });
    const existingSet = new Set(existing.map((s) => dayKey(s.day)));
    toCompute = days.filter((d) => !existingSet.has(dayKey(d)));
  }

  let computedCount = 0;
  const failures: string[] = [];
  // Esegui in chunk per non saturare il pool DB
  for (let i = 0; i < toCompute.length; i += 4) {
    const chunk = toCompute.slice(i, i + 4);
    const results = await Promise.allSettled(chunk.map((d) => computeDaySnapshot(d)));
    for (let j = 0; j < chunk.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled") {
        try {
          await persistDaySnapshot(chunk[j], r.value);
          computedCount++;
        } catch (e) {
          failures.push(`${dayKey(chunk[j])}: persist ${String(e)}`);
        }
      } else {
        failures.push(`${dayKey(chunk[j])}: compute ${String(r.reason)}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    totalDays: days.length,
    skipped: days.length - toCompute.length,
    computed: computedCount,
    failures,
    from: dayKey(startDay),
    to: dayKey(new Date(today.getTime() - 86400000)),
  });
}
