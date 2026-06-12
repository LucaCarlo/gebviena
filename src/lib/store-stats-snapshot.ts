/**
 * Snapshot giornalieri precalcolati per /admin/store/stats.
 *
 * Strategia: per ogni giorno passato salviamo aggregate "pronti" (revenue,
 * ordini, abbandonati, unique visitors, top prodotti, canali). Per un periodo
 * lungo (es. 365 giorni) sommiamo 365 righe leggere invece di rifare la query
 * COUNT DISTINCT su 1.3M PageView ogni volta.
 *
 * - Lazy materialization: la prima volta che si chiede un giorno mancante,
 *   lo calcoliamo e salviamo. Le richieste successive sono istantanee.
 * - Oggi NON viene mai snapshot-ato (cambia continuamente): si calcola live.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const SALES_STATUSES = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP",
  "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED",
] as const;
export const ABANDONED_STATUSES = ["ABANDONED_CHECKOUT", "PAYMENT_FAILED", "CANCELLED"] as const;

export interface SnapshotData {
  revenueCents: number;
  refundCents: number;
  orderCount: number;
  abandonedCount: number;
  uniqueVisitors: number;
  topProducts: { name: string; sku: string; quantity: number; revenueCents: number }[];
  channels: Record<string, number>;
}

export function channelFromReferrer(ref: string | null | undefined): string {
  if (!ref) return "Diretto";
  try {
    const u = new URL(ref);
    const host = u.hostname.replace(/^www\./, "");
    if (host.endsWith(".google.com") || host === "google.com") return "Google";
    if (host.endsWith(".bing.com") || host === "bing.com") return "Bing";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("twitter") || host === "t.co" || host === "x.com") return "X/Twitter";
    if (host.includes("pinterest")) return "Pinterest";
    if (host.endsWith("gebruederthonetvienna.com")) return "Sito principale";
    return host;
  } catch { return "Diretto"; }
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** Bound del giorno in ora locale del server (date naïve). */
export function dayBounds(day: Date): { from: Date; to: Date } {
  const from = new Date(day); from.setHours(0, 0, 0, 0);
  const to = new Date(day); to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** Calcola i dati raw per un singolo giorno (no DB write). */
export async function computeDaySnapshot(day: Date): Promise<SnapshotData> {
  const { from, to } = dayBounds(day);

  const [sales, refunds, abandoned, visitorsRow, topRows, channelRows] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { in: [...SALES_STATUSES] } },
      _sum: { totalCents: true }, _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
      _sum: { refundAmountCents: true },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: from, lte: to },
        OR: [
          { status: { in: [...ABANDONED_STATUSES] } },
          { status: "PENDING", NOT: { paymentProvider: "bonifico" } },
        ],
      },
    }),
    prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT IFNULL(ipHash, id)) AS n FROM PageView
      WHERE host = 'STORE' AND createdAt >= ${from} AND createdAt <= ${to}
    `),
    prisma.$queryRaw<{ name: string; sku: string; qty: bigint; rev: bigint }[]>(Prisma.sql`
      SELECT oi.productName AS name, oi.sku AS sku, SUM(oi.quantity) AS qty, SUM(oi.totalCents) AS rev
      FROM OrderItem oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.status IN (${Prisma.join([...SALES_STATUSES])})
        AND o.createdAt >= ${from} AND o.createdAt <= ${to}
      GROUP BY oi.productName, oi.sku ORDER BY rev DESC LIMIT 50
    `),
    prisma.$queryRaw<{ referrer: string | null; n: bigint }[]>(Prisma.sql`
      SELECT referrer, COUNT(*) AS n FROM PageView
      WHERE host = 'STORE' AND createdAt >= ${from} AND createdAt <= ${to}
      GROUP BY referrer ORDER BY n DESC LIMIT 200
    `),
  ]);

  const channels: Record<string, number> = {};
  for (const r of channelRows) {
    const ch = channelFromReferrer(r.referrer);
    channels[ch] = (channels[ch] || 0) + Number(r.n);
  }

  return {
    revenueCents: Number(sales._sum.totalCents || 0),
    refundCents: Number(refunds._sum.refundAmountCents || 0),
    orderCount: sales._count._all,
    abandonedCount: abandoned,
    uniqueVisitors: Number(visitorsRow?.[0]?.n || 0),
    topProducts: topRows.map((r) => ({
      name: r.name, sku: r.sku, quantity: Number(r.qty), revenueCents: Number(r.rev),
    })),
    channels,
  };
}

/** Scrive (upsert) lo snapshot del giorno indicato.
 *  Usa raw SQL perché Prisma.upsert con @db.Date ha un bug noto
 *  ("Query upsertOneStoreStatsDaySnapshot is required to return data"). */
export async function persistDaySnapshot(day: Date, data: SnapshotData): Promise<void> {
  const dayStr = dayKey(day);
  const topJson = JSON.stringify(data.topProducts);
  const chanJson = JSON.stringify(data.channels);
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO StoreStatsDaySnapshot (day, revenueCents, refundCents, orderCount, abandonedCount, uniqueVisitors, topProductsJson, channelsJson, computedAt)
    VALUES (${dayStr}, ${data.revenueCents}, ${data.refundCents}, ${data.orderCount}, ${data.abandonedCount}, ${data.uniqueVisitors}, ${topJson}, ${chanJson}, NOW())
    ON DUPLICATE KEY UPDATE
      revenueCents = VALUES(revenueCents),
      refundCents = VALUES(refundCents),
      orderCount = VALUES(orderCount),
      abandonedCount = VALUES(abandonedCount),
      uniqueVisitors = VALUES(uniqueVisitors),
      topProductsJson = VALUES(topProductsJson),
      channelsJson = VALUES(channelsJson),
      computedAt = NOW()
  `);
}

export interface DayWithSnapshot {
  day: Date;
  data: SnapshotData;
}

/** Cache del primo giorno con dati (per non iterare anni di giorni vuoti). */
let _dataStartCache: { value: Date | null; expires: number } | null = null;
async function getDataStartDay(): Promise<Date | null> {
  if (_dataStartCache && Date.now() < _dataStartCache.expires) return _dataStartCache.value;
  const [pvRows, oldestOrder] = await Promise.all([
    prisma.$queryRaw<{ d: Date | null }[]>`SELECT MIN(createdAt) AS d FROM PageView WHERE host = 'STORE'`,
    prisma.order.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  const dates: Date[] = [];
  if (pvRows?.[0]?.d) dates.push(new Date(pvRows[0].d));
  if (oldestOrder?.createdAt) dates.push(new Date(oldestOrder.createdAt));
  const min = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  if (min) min.setHours(0, 0, 0, 0);
  _dataStartCache = { value: min, expires: Date.now() + 5 * 60 * 1000 };
  return min;
}

/**
 * Per ogni giorno passato nel range [from..to] (escluso oggi):
 *   - se snapshot esiste → usa quello
 *   - se manca → calcolalo e salvalo
 * Ritorna i dati pronti da sommare.
 *
 * GUARD: clampa `from` al primo giorno con dati reali (evita di iterare anni
 * di giorni vuoti, es. compare period per "Tutto" che parte nel 1974).
 */
export async function ensureSnapshotsForRange(from: Date, to: Date): Promise<DayWithSnapshot[]> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dataStart = await getDataStartDay();
  if (!dataStart) return []; // niente dati nel DB

  const effectiveFrom = from < dataStart ? dataStart : from;
  const endExclusiveToday = new Date(Math.min(to.getTime(), today.getTime() - 1));
  if (effectiveFrom > endExclusiveToday) return [];

  const cursor = new Date(effectiveFrom); cursor.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  while (cursor <= endExclusiveToday) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (days.length === 0) return [];

  const existing = await prisma.storeStatsDaySnapshot.findMany({
    where: { day: { in: days } },
  });
  const existingByKey = new Map(existing.map((s) => [dayKey(s.day), s]));

  const missing = days.filter((d) => !existingByKey.has(dayKey(d)));
  // Calcola in parallelo (max 6 alla volta per non saturare il pool)
  for (let i = 0; i < missing.length; i += 6) {
    const chunk = missing.slice(i, i + 6);
    const results = await Promise.all(chunk.map((d) => computeDaySnapshot(d)));
    await Promise.all(chunk.map((d, j) => persistDaySnapshot(d, results[j])));
    // Aggiungi alla mappa per la fase di assemblaggio
    for (let j = 0; j < chunk.length; j++) {
      const d = chunk[j];
      const data = results[j];
      existingByKey.set(dayKey(d), {
        day: d,
        revenueCents: BigInt(data.revenueCents),
        refundCents: BigInt(data.refundCents),
        orderCount: data.orderCount,
        abandonedCount: data.abandonedCount,
        uniqueVisitors: data.uniqueVisitors,
        topProductsJson: JSON.stringify(data.topProducts),
        channelsJson: JSON.stringify(data.channels),
        computedAt: new Date(),
      });
    }
  }

  return days.map((d) => {
    const row = existingByKey.get(dayKey(d))!;
    return {
      day: row.day,
      data: {
        revenueCents: Number(row.revenueCents),
        refundCents: Number(row.refundCents),
        orderCount: row.orderCount,
        abandonedCount: row.abandonedCount,
        uniqueVisitors: row.uniqueVisitors,
        topProducts: row.topProductsJson ? JSON.parse(row.topProductsJson) : [],
        channels: row.channelsJson ? JSON.parse(row.channelsJson) : {},
      },
    };
  });
}

/** True se il range include oggi. */
export function rangeIncludesToday(from: Date, to: Date): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return from <= today && to >= today;
}

/**
 * Aggrega un array di snapshot giornalieri.
 * - revenue, refund, orderCount, abandoned, uniqueVisitors: somma diretta
 *   (uniqueVisitors è approssimato: stesso visitatore in giorni diversi
 *   conta più volte. Per analytics è accettabile e coerente con GA "Users by day".)
 * - topProducts: somma quantità+revenue per (name+sku), prende top 10
 * - channels: somma counts per channel name, prende top 8
 */
export function aggregateSnapshots(snapshots: SnapshotData[]) {
  let revenueCents = 0, refundCents = 0, orderCount = 0, abandonedCount = 0, uniqueVisitors = 0;
  const productMap = new Map<string, { name: string; sku: string; quantity: number; revenueCents: number }>();
  const channelMap = new Map<string, number>();

  for (const s of snapshots) {
    revenueCents += s.revenueCents;
    refundCents += s.refundCents;
    orderCount += s.orderCount;
    abandonedCount += s.abandonedCount;
    uniqueVisitors += s.uniqueVisitors;
    for (const p of s.topProducts) {
      const k = `${p.sku}::${p.name}`;
      const cur = productMap.get(k);
      if (cur) {
        cur.quantity += p.quantity;
        cur.revenueCents += p.revenueCents;
      } else {
        productMap.set(k, { ...p });
      }
    }
    for (const [name, n] of Object.entries(s.channels)) {
      channelMap.set(name, (channelMap.get(name) || 0) + n);
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10);
  const channels = Array.from(channelMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { revenueCents, refundCents, orderCount, abandonedCount, uniqueVisitors, topProducts, channels };
}
