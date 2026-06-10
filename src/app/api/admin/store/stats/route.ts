import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Statistiche store per periodo + confronto col periodo precedente.
 *
 * Query string:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   &compareFrom=YYYY-MM-DD&compareTo=YYYY-MM-DD   (opzionale, default: stessa
 *      durata immediatamente prima del periodo principale)
 *   &compare=0   per disattivare il confronto
 *
 * Risposta { current: PeriodStats, compare: PeriodStats | null, totals: TotalSinceStart }.
 */

// Stati "vendita vera" (rientrano in fatturato + numero ordini).
const SALES_STATUSES = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP",
  "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED",
] as const;

// Stati "carrello abbandonato".
const ABANDONED_STATUSES = ["ABANDONED_CHECKOUT", "PAYMENT_FAILED", "CANCELLED"] as const;

interface PeriodInput { from: Date; to: Date }

interface ProductRow { name: string; slug: string | null; quantity: number; revenueCents: number }
interface ChannelRow { name: string; count: number }

interface PeriodStats {
  from: string;
  to: string;
  periodDays: number;
  revenueCents: number;
  orderCount: number;
  aovCents: number;
  uniqueVisitors: number;
  conversionRate: number; // percentuale 0..100
  abandonedCount: number;
  newCustomers: number;
  recurringCustomers: number;
  topProducts: ProductRow[];
  bottomProducts: ProductRow[];
  channels: ChannelRow[];
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

// Estrae il "canale" dal referrer raw (rimuove http://, www., path).
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
  } catch {
    return "Diretto";
  }
}

async function computePeriod({ from, to }: PeriodInput): Promise<PeriodStats> {
  const periodDays = diffDays(from, to);

  // Tutte le query del periodo girano IN PARALLELO (Promise.all): le query
  // più lente sono quelle su PageView (COUNT DISTINCT) e l'aggregazione
  // OrderItem; in serie il tempo si somma, in parallelo viene capped sulla
  // più lenta. Nessuna dipende dal risultato di un'altra (la lista dei
  // variantId per la query "salesByVariant" la prendiamo dal subset di
  // tutti gli StoreProduct: serve un piccolo trick con chaining).
  const allProductsPromise = prisma.storeProduct.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      product: { select: { name: true, slug: true } },
      variants: { select: { id: true } },
    },
  });

  const [
    sales,
    refunds,
    abandoned,
    visitorsRow,
    topRows,
    distinctEmails,
    channelRows,
    allProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { in: [...SALES_STATUSES] } },
      _sum: { totalCents: true },
      _count: { _all: true },
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
      SELECT COUNT(DISTINCT IFNULL(ipHash, id)) AS n
      FROM PageView
      WHERE host = 'STORE' AND createdAt >= ${from} AND createdAt <= ${to}
    `),
    prisma.$queryRaw<{ name: string; sku: string; qty: bigint; rev: bigint }[]>(Prisma.sql`
      SELECT oi.productName AS name, oi.sku AS sku,
             SUM(oi.quantity) AS qty,
             SUM(oi.totalCents) AS rev
      FROM OrderItem oi
      JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.status IN (${Prisma.join([...SALES_STATUSES])})
        AND o.createdAt >= ${from} AND o.createdAt <= ${to}
      GROUP BY oi.productName, oi.sku
      ORDER BY rev DESC
      LIMIT 10
    `),
    prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: { in: [...SALES_STATUSES] } },
      select: { email: true },
      distinct: ["email"],
    }),
    prisma.$queryRaw<{ referrer: string | null; n: bigint }[]>(Prisma.sql`
      SELECT referrer, COUNT(*) AS n
      FROM PageView
      WHERE host = 'STORE' AND createdAt >= ${from} AND createdAt <= ${to}
      GROUP BY referrer
      ORDER BY n DESC
      LIMIT 200
    `),
    allProductsPromise,
  ]);

  // 1. Fatturato
  const grossCents = sales._sum.totalCents || 0;
  const refundCents = refunds._sum.refundAmountCents || 0;
  const revenueCents = grossCents - refundCents;
  const orderCount = sales._count._all;
  const aovCents = orderCount > 0 ? Math.round(revenueCents / orderCount) : 0;

  // 2. Visitatori unici + conversion
  const uniqueVisitors = Number(visitorsRow[0]?.n || 0);
  const conversionRate = uniqueVisitors > 0 ? (orderCount / uniqueVisitors) * 100 : 0;

  // 3. Top prodotti
  const topProducts: ProductRow[] = topRows.map((r) => ({
    name: r.name,
    slug: r.sku,
    quantity: Number(r.qty),
    revenueCents: Number(r.rev),
  }));

  // 4. Bottom prodotti: per ognuno calcolo le vendite del periodo sulle sue
  // varianti. Una query aggiuntiva sole sulle varianti del catalogo (con
  // IN-clause limitata): la lanciamo solo se ci sono prodotti.
  const variantIdsByProduct = new Map<string, string[]>();
  for (const p of allProducts) variantIdsByProduct.set(p.id, p.variants.map((v) => v.id));
  const allVariantIds = allProducts.flatMap((p) => p.variants.map((v) => v.id));
  let salesByVariant: Map<string, { qty: number; rev: number }> = new Map();
  if (allVariantIds.length > 0) {
    const rows = await prisma.$queryRaw<{ variantId: string; qty: bigint; rev: bigint }[]>(Prisma.sql`
      SELECT oi.variantId AS variantId, SUM(oi.quantity) AS qty, SUM(oi.totalCents) AS rev
      FROM OrderItem oi
      JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.status IN (${Prisma.join([...SALES_STATUSES])})
        AND o.createdAt >= ${from} AND o.createdAt <= ${to}
        AND oi.variantId IN (${Prisma.join(allVariantIds)})
      GROUP BY oi.variantId
    `);
    salesByVariant = new Map(rows.map((r) => [r.variantId, { qty: Number(r.qty), rev: Number(r.rev) }]));
  }
  const productSales: ProductRow[] = allProducts.map((p) => {
    let qty = 0, rev = 0;
    for (const vid of variantIdsByProduct.get(p.id) || []) {
      const s = salesByVariant.get(vid);
      if (s) { qty += s.qty; rev += s.rev; }
    }
    return { name: p.product?.name || "—", slug: p.product?.slug || null, quantity: qty, revenueCents: rev };
  });
  productSales.sort((a, b) => a.quantity - b.quantity || a.revenueCents - b.revenueCents);
  const bottomProducts = productSales.slice(0, 10);

  // 5. Clienti nuovi vs ricorrenti
  const emails = distinctEmails.map((o) => o.email);
  let newCustomers = 0;
  let recurringCustomers = 0;
  if (emails.length > 0) {
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

  // 6. Canali (referrer breakdown)
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
    from: from.toISOString(),
    to: to.toISOString(),
    periodDays,
    revenueCents,
    orderCount,
    aovCents,
    uniqueVisitors,
    conversionRate,
    abandonedCount: abandoned,
    newCustomers,
    recurringCustomers,
    topProducts,
    bottomProducts,
    channels,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission("store_orders", "view");
  if (isErrorResponse(auth)) return auth;

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 86400000); // ultimi 30 gg
  const from = parseDate(sp.get("from"), defaultFrom);
  const to = parseDate(sp.get("to"), now);
  const wantCompare = sp.get("compare") !== "0";

  // Current + (eventuale) Compare + totali storici: tutti in parallelo.
  const cmpRange = wantCompare
    ? { from: parseDate(sp.get("compareFrom"), defaultCompare(from, to).from),
        to: parseDate(sp.get("compareTo"), defaultCompare(from, to).to) }
    : null;

  const [current, compare, totalsRow, totalsRefund] = await Promise.all([
    computePeriod({ from, to }),
    cmpRange ? computePeriod(cmpRange) : Promise.resolve(null),
    prisma.order.aggregate({
      where: { status: { in: [...SALES_STATUSES] } },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
      _sum: { refundAmountCents: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      current,
      compare,
      totals: {
        revenueCents: (totalsRow._sum.totalCents || 0) - (totalsRefund._sum.refundAmountCents || 0),
        orderCount: totalsRow._count._all,
      },
    },
  });
}
