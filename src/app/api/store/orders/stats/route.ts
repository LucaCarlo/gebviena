import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Statistiche aggregate ordini per un dato periodo.
 *
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Restituisce:
 * - revenueCents: fatturato netto del periodo
 *     = somma(totalCents) ordini incassati nel periodo
 *     - somma(refundAmountCents) sui rimborsati/parzialmente rimborsati nel periodo
 * - count: numero ordini "incassati" (PAID/PROCESSING/SHIPPED/DELIVERED/PICKED_UP/RETURNED/REFUNDED/PARTIALLY_REFUNDED)
 * - pendingBonificoCents: totale ordini PENDING+bonifico (in attesa di accredito, non ancora fatturato)
 * - pendingBonificoCount: numero ordini bonifico in attesa
 */
export async function GET(req: NextRequest) {
  const result = await requirePermission("store_orders", "view");
  if (isErrorResponse(result)) return result;

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  const dateFilter: Prisma.OrderWhereInput = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) (dateFilter.createdAt as { gte?: Date }).gte = new Date(from);
    if (to) (dateFilter.createdAt as { lte?: Date }).lte = new Date(to);
  }

  // Fatturato lordo: ordini incassati nel periodo
  const incassati = await prisma.order.aggregate({
    where: {
      ...dateFilter,
      status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP", "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED"] },
    },
    _sum: { totalCents: true },
    _count: { _all: true },
  });

  // Rimborsi sul periodo: solo per ordini REFUNDED / PARTIALLY_REFUNDED
  const rimborsati = await prisma.order.aggregate({
    where: {
      ...dateFilter,
      status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
    },
    _sum: { refundAmountCents: true },
  });

  // Conteggi globali per stato — NON filtrati per data: rappresentano lo stato
  // corrente del sistema (es. "Da evadere: 12" = 12 ordini ancora da spedire
  // indipendentemente da quando sono stati creati).
  const globalGroups = await prisma.order.groupBy({
    by: ["status", "paymentProvider"],
    _count: { _all: true },
  });
  let bonificoPending = 0;
  let daEvadere = 0;
  let spediti = 0;
  let consegnati = 0;
  let rimborsiCount = 0;
  for (const g of globalGroups) {
    const n = g._count._all;
    if (g.status === "PENDING" && g.paymentProvider === "bonifico") bonificoPending += n;
    else if (g.status === "PAID" || g.status === "PROCESSING") daEvadere += n;
    else if (g.status === "SHIPPED") spediti += n;
    else if (g.status === "DELIVERED" || g.status === "PICKED_UP") consegnati += n;
    else if (g.status === "RETURNED" || g.status === "REFUNDED" || g.status === "PARTIALLY_REFUNDED") rimborsiCount += n;
  }

  // Totale € in attesa di bonifico (anche questo globale, non per data).
  const bonifico = await prisma.order.aggregate({
    where: { status: "PENDING", paymentProvider: "bonifico" },
    _sum: { totalCents: true },
  });

  const grossCents = incassati._sum.totalCents || 0;
  const refundsCents = rimborsati._sum.refundAmountCents || 0;
  const revenueCents = grossCents - refundsCents;

  return NextResponse.json({
    success: true,
    data: {
      // Per periodo
      revenueCents,
      grossCents,
      refundsCents,
      count: incassati._count._all,
      // Globali (stato corrente, indipendenti dal periodo)
      pendingBonificoCount: bonificoPending,
      pendingBonificoCents: bonifico._sum.totalCents || 0,
      daEvadereCount: daEvadere,
      shippedCount: spediti,
      consegnatiCount: consegnati,
      rimborsiCount,
      from: from || null,
      to: to || null,
    },
  });
}
