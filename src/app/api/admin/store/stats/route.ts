import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import {
  SALES_STATUSES,
  computeDaySnapshot,
  ensureSnapshotsForRange,
  rangeIncludesToday,
  aggregateSnapshots,
  type SnapshotData,
} from "@/lib/store-stats-snapshot";

export const dynamic = "force-dynamic";

// Cache in memoria per le risposte assemblate. TTL breve perché oggi cambia
// continuamente. Chiave = tutti i parametri di query rilevanti.
type CacheEntry = { expires: number; payload: unknown };
const RESPONSE_CACHE = new Map<string, CacheEntry>();
const RESPONSE_CACHE_TTL_MS = 30_000;
function cacheGet(key: string): unknown | null {
  const v = RESPONSE_CACHE.get(key);
  if (!v) return null;
  if (Date.now() > v.expires) { RESPONSE_CACHE.delete(key); return null; }
  return v.payload;
}
function cachePut(key: string, payload: unknown): void {
  if (RESPONSE_CACHE.size > 200) {
    const oldestKey = RESPONSE_CACHE.keys().next().value;
    if (oldestKey) RESPONSE_CACHE.delete(oldestKey);
  }
  RESPONSE_CACHE.set(key, { expires: Date.now() + RESPONSE_CACHE_TTL_MS, payload });
}

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

/**
 * Calcola le statistiche per il periodo [from..to].
 *
 * Strategia:
 *   - Giorni PASSATI → snapshot precalcolati (somma istantanea)
 *   - OGGI (se incluso nel range) → query live (singolo giorno, ~100ms)
 *   - Bottom products + new/recurring → live (sono già veloci: Order ha
 *     poche righe, l'unico join pesante è bottom che è ~30ms anche all-time)
 *
 * `kind`:
 *   - "core":  aggregate KPI veloci (per UI: render immediato dei numeri)
 *   - "heavy": top/bottom/channels (per render delle tabelle)
 *   - "all":   tutti
 */
async function computePeriod({ from, to }: PeriodInput, kind: "core" | "heavy" | "all" = "all"): Promise<PeriodStats> {
  const periodDays = diffDays(from, to);
  const wantCore = kind !== "heavy";
  const wantHeavy = kind !== "core";

  // 1) Snapshot dei giorni passati (lazy materialization se mancanti)
  const pastSnaps = await ensureSnapshotsForRange(from, to);
  const pastData: SnapshotData[] = pastSnaps.map((s) => s.data);

  // 2) Oggi (se incluso) → calcolato live, singolo giorno
  let todayData: SnapshotData | null = null;
  if (rangeIncludesToday(from, to)) {
    todayData = await computeDaySnapshot(new Date());
  }

  const all = todayData ? [...pastData, todayData] : pastData;
  const agg = aggregateSnapshots(all);

  // 3) New vs Recurring → live (cheap: Order ha 59 righe, GROUP BY su email è ~ms)
  let newCustomers = 0, recurringCustomers = 0;
  if (wantCore) {
    const distinctEmails = await prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: { in: [...SALES_STATUSES] } },
      select: { email: true }, distinct: ["email"],
    });
    const emails = distinctEmails.map((o) => o.email);
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
  }

  // 4) Bottom products → live (è ~30ms anche all-time)
  let bottomProducts: ProductRow[] = [];
  if (wantHeavy) {
    const bottomRows = await prisma.$queryRaw<{ name: string; slug: string; qty: bigint; rev: bigint }[]>(Prisma.sql`
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
    `);
    bottomProducts = bottomRows.map((r) => ({
      name: r.name || "—", slug: r.slug || null,
      quantity: Number(r.qty), revenueCents: Number(r.rev),
    }));
  }

  // KPI derivati
  const revenueCents = agg.revenueCents - agg.refundCents;
  const orderCount = agg.orderCount;
  const aovCents = orderCount > 0 ? Math.round(revenueCents / orderCount) : 0;
  const uniqueVisitors = agg.uniqueVisitors;
  const conversionRate = uniqueVisitors > 0 ? (orderCount / uniqueVisitors) * 100 : 0;

  // Top products → dal snapshot aggregate; aggiungiamo slug=sku per compatibilità con UI
  const topProducts: ProductRow[] = wantHeavy ? agg.topProducts.map((p) => ({
    name: p.name, slug: p.sku, quantity: p.quantity, revenueCents: p.revenueCents,
  })) : [];
  const channels: ChannelRow[] = wantHeavy ? agg.channels : [];

  return {
    from: from.toISOString(), to: to.toISOString(), periodDays,
    revenueCents: wantCore ? revenueCents : 0,
    orderCount: wantCore ? orderCount : 0,
    aovCents: wantCore ? aovCents : 0,
    uniqueVisitors: wantCore ? uniqueVisitors : 0,
    conversionRate: wantCore ? conversionRate : 0,
    abandonedCount: wantCore ? agg.abandonedCount : 0,
    newCustomers, recurringCustomers,
    topProducts, bottomProducts, channels,
  };
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const auth = await requirePermission("store_orders", "view");
  const tAuth = Date.now();
  if (isErrorResponse(auth)) return auth;

  const sp = req.nextUrl.searchParams;
  // Chiave cache: tutti i parametri rilevanti (ordinati)
  const cacheKey = ["from","to","compare","kind","compareFrom","compareTo"].map((k) => `${k}=${sp.get(k) || ""}`).join("&");
  const cached = cacheGet(cacheKey);
  if (cached) {
    const t = Date.now() - t0;
    // eslint-disable-next-line no-console
    console.log(`[stats] CACHE HIT ${cacheKey.slice(0,120)} total=${t}ms`);
    const res = NextResponse.json(cached);
    res.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
    res.headers.set("X-Backend-Time", `${t}ms (cache)`);
    return res;
  }
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
    kind === "heavy" ? Promise.resolve(null) : prisma.order.aggregate({
      where: { status: { in: [...SALES_STATUSES] } },
      _sum: { totalCents: true }, _count: { _all: true },
    }),
    kind === "heavy" ? Promise.resolve(null) : prisma.order.aggregate({
      where: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
      _sum: { refundAmountCents: true },
    }),
  ]);
  const tCompute = Date.now();

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

  const total = Date.now() - t0;
  // eslint-disable-next-line no-console
  console.log(`[stats] kind=${kind} compare=${wantCompare ? "1" : "0"} from=${from.toISOString().slice(0,10)} to=${to.toISOString().slice(0,10)} auth=${tAuth-t0}ms compute=${tCompute-tAuth}ms total=${total}ms`);

  const payload = { success: true, data };
  cachePut(cacheKey, payload);
  const res = NextResponse.json(payload);
  res.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
  res.headers.set("X-Backend-Time", `${total}ms`);
  return res;
}
