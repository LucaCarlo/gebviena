import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Stati "vendita vera" (rientrano in fatturato + numero ordini).
const SALES_STATUSES = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP",
  "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED",
] as const;
const ABANDONED_STATUSES = ["ABANDONED_CHECKOUT", "PAYMENT_FAILED", "CANCELLED"] as const;

interface PeriodInput { from: Date; to: Date }
interface ProductRow { name: string; slug: string | null; quantity: number; revenueCents: number }
interface ChannelRow { name: string; count: number }
interface PeriodStats {
  from: string; to: string; periodDays: number;
  revenueCents: number; orderCount: number; aovCents: number;
  uniqueVisitors: number; conversionRate: number;
  abandonedCount: number;
  newCustomers: number; recurringCustomers: number;
  topProducts: ProductRow[]; bottomProducts: ProductRow[]; channels: ChannelRow[];
}

function parseDate(s: string | null, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : fallback;
}
function defaultCompare(from: Date, to: Date): { from: Date; to: Date } {
  const ms = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - ms - 86400000), to: new Date(from.getTime() - 86400000) };
}
function diffDays(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
}
function channelFromReferrer(ref: string | null | undefined): string {
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

/**
 * Calcola le statistiche del periodo. `kind`:
 *   - "core":  KPI numerici (veloce, query con indici)
 *   - "heavy": top/bottom prodotti + canali (più lento)
 *   - "all":   entrambi (default per backward-compat)
 *
 * L'UI può chiamare separatamente core+heavy per mostrare prima i KPI.
 */
async function prismaSalesAggregate({ from, to }: PeriodInput) {
  return prisma.order.aggregate({
    where: { createdAt: { gte: from, lte: to }, status: { in: [...SALES_STATUSES] } },
    _sum: { totalCents: true }, _count: { _all: true },
  });
}

async function computePeriod({ from, to }: PeriodInput, kind: "core" | "heavy" | "all" = "all"): Promise<PeriodStats> {
  const periodDays = diffDays(from, to);
  const wantCore = kind !== "heavy";
  const wantHeavy = kind !== "core";

  // Le query CORE girano se richieste, altrimenti rispondiamo null/[] subito.
  // Niente tuple-typing: TS sa l'inferenza in destructuring di Promise.all.
  const sales = wantCore ? await prismaSalesAggregate({ from, to }) : null;
  // Lancia in parallelo solo le altre — sales serve subito per orderCount,
  // ma le restanti non hanno dipendenze tra loro.
  const [refunds, abandoned, visitorsRow, distinctEmails, topRows, channelRows, bottomRows] = await Promise.all([
    wantCore ? prisma.order.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
      _sum: { refundAmountCents: true },
    }) : Promise.resolve(null),
    wantCore ? prisma.order.count({
      where: {
        createdAt: { gte: from, lte: to },
        OR: [
          { status: { in: [...ABANDONED_STATUSES] } },
          { status: "PENDING", NOT: { paymentProvider: "bonifico" } },
        ],
      },
    }) : Promise.resolve(0),
    wantCore ? prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT IFNULL(ipHash, id)) AS n
      FROM PageView
      WHERE host = 'STORE' AND createdAt >= ${from} AND createdAt <= ${to}
    `) : Promise.resolve([] as { n: bigint }[]),
    wantCore ? prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: { in: [...SALES_STATUSES] } },
      select: { email: true }, distinct: ["email"],
    }) : Promise.resolve([] as { email: string }[]),
    wantHeavy ? prisma.$queryRaw<{ name: string; sku: string; qty: bigint; rev: bigint }[]>(Prisma.sql`
      SELECT oi.productName AS name, oi.sku AS sku,
             SUM(oi.quantity) AS qty, SUM(oi.totalCents) AS rev
      FROM OrderItem oi
      JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.status IN (${Prisma.join([...SALES_STATUSES])})
        AND o.createdAt >= ${from} AND o.createdAt <= ${to}
      GROUP BY oi.productName, oi.sku ORDER BY rev DESC LIMIT 10
    `) : Promise.resolve([] as { name: string; sku: string; qty: bigint; rev: bigint }[]),
    wantHeavy ? prisma.$queryRaw<{ referrer: string | null; n: bigint }[]>(Prisma.sql`
      SELECT referrer, COUNT(*) AS n FROM PageView
      WHERE host = 'STORE' AND createdAt >= ${from} AND createdAt <= ${to}
      GROUP BY referrer ORDER BY n DESC LIMIT 200
    `) : Promise.resolve([] as { referrer: string | null; n: bigint }[]),
    wantHeavy ? prisma.$queryRaw<{ name: string; slug: string; qty: bigint; rev: bigint }[]>(Prisma.sql`
      SELECT p.name AS name, p.slug AS slug,
             COALESCE(SUM(oi.quantity), 0) AS qty,
             COALESCE(SUM(oi.totalCents), 0) AS rev
      FROM StoreProduct sp
      JOIN Product p ON p.id = sp.productId
      LEFT JOIN StoreProductVariant spv ON spv.storeProductId = sp.id
      LEFT JOIN OrderItem oi ON oi.variantId = spv.id
      LEFT JOIN \`Order\` o ON o.id = oi.orderId
        AND o.status IN (${Prisma.join([...SALES_STATUSES])})
        AND o.createdAt >= ${from} AND o.createdAt <= ${to}
      WHERE sp.isPublished = 1
      GROUP BY sp.id, p.name, p.slug
      ORDER BY qty ASC, rev ASC LIMIT 10
    `) : Promise.resolve([] as { name: string; slug: string; qty: bigint; rev: bigint }[]),
  ]);

  // CORE
  const grossCents = sales?._sum.totalCents || 0;
  const refundCents = refunds?._sum.refundAmountCents || 0;
  const revenueCents = grossCents - refundCents;
  const orderCount = sales?._count._all || 0;
  const aovCents = orderCount > 0 ? Math.round(revenueCents / orderCount) : 0;
  const uniqueVisitors = Number(visitorsRow?.[0]?.n || 0);
  const conversionRate = uniqueVisitors > 0 ? (orderCount / uniqueVisitors) * 100 : 0;
  const abandonedCount = abandoned || 0;

  // New vs Recurring
  const emails = distinctEmails.map((o) => o.email);
  let newCustomers = 0, recurringCustomers = 0;
  if (wantCore && emails.length > 0) {
    const firstOrders = await prisma.order.groupBy({
      by: ["email"],
      where: { email: { in: emails }, status: { in: [...SALES_STATUSES] } },
      _min: { createdAt: true },
    });
    for (const f of firstOrders) {
      const firstAt = f._min.createdAt;
      if (firstAt && firstAt >= from) newCustomers++;
      else recurringCustomers++;
    }
  }

  // HEAVY
  const topProducts: ProductRow[] = topRows.map((r) => ({
    name: r.name, slug: r.sku, quantity: Number(r.qty), revenueCents: Number(r.rev),
  }));
  const bottomProducts: ProductRow[] = bottomRows.map((r) => ({
    name: r.name || "—", slug: r.slug || null, quantity: Number(r.qty), revenueCents: Number(r.rev),
  }));
  const channelMap = new Map<string, number>();
  for (const r of channelRows) {
    const ch = channelFromReferrer(r.referrer);
    channelMap.set(ch, (channelMap.get(ch) || 0) + Number(r.n));
  }
  const channels: ChannelRow[] = Array.from(channelMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    from: from.toISOString(), to: to.toISOString(), periodDays,
    revenueCents, orderCount, aovCents,
    uniqueVisitors, conversionRate,
    abandonedCount,
    newCustomers, recurringCustomers,
    topProducts, bottomProducts, channels,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission("store_orders", "view");
  if (isErrorResponse(auth)) return auth;

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 86400000);
  const from = parseDate(sp.get("from"), defaultFrom);
  const to = parseDate(sp.get("to"), now);
  const wantCompare = sp.get("compare") !== "0";
  const kindParam = sp.get("kind");
  const kind: "core" | "heavy" | "all" =
    kindParam === "core" ? "core" : kindParam === "heavy" ? "heavy" : "all";

  const cmpRange = wantCompare
    ? { from: parseDate(sp.get("compareFrom"), defaultCompare(from, to).from),
        to: parseDate(sp.get("compareTo"), defaultCompare(from, to).to) }
    : null;

  const [current, compare, totalsRow, totalsRefund] = await Promise.all([
    computePeriod({ from, to }, kind),
    cmpRange ? computePeriod(cmpRange, kind) : Promise.resolve(null),
    // I totali storici hanno senso solo sul primo fetch (kind=core o all): salto su heavy.
    kind === "heavy" ? Promise.resolve(null) : prisma.order.aggregate({
      where: { status: { in: [...SALES_STATUSES] } },
      _sum: { totalCents: true }, _count: { _all: true },
    }),
    kind === "heavy" ? Promise.resolve(null) : prisma.order.aggregate({
      where: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
      _sum: { refundAmountCents: true },
    }),
  ]);

  const data: {
    current: PeriodStats;
    compare: PeriodStats | null;
    totals?: { revenueCents: number; orderCount: number };
  } = { current, compare };
  if (totalsRow && totalsRefund) {
    data.totals = {
      revenueCents: (totalsRow._sum.totalCents || 0) - (totalsRefund._sum.refundAmountCents || 0),
      orderCount: totalsRow._count._all,
    };
  }

  const res = NextResponse.json({ success: true, data });
  res.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
  return res;
}
