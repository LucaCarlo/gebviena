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

  // In attesa di bonifico (PENDING + paymentProvider=bonifico)
  const bonifico = await prisma.order.aggregate({
    where: {
      ...dateFilter,
      status: "PENDING",
      paymentProvider: "bonifico",
    },
    _sum: { totalCents: true },
    _count: { _all: true },
  });

  const grossCents = incassati._sum.totalCents || 0;
  const refundsCents = rimborsati._sum.refundAmountCents || 0;
  const revenueCents = grossCents - refundsCents;

  return NextResponse.json({
    success: true,
    data: {
      revenueCents,
      grossCents,
      refundsCents,
      count: incassati._count._all,
      pendingBonificoCents: bonifico._sum.totalCents || 0,
      pendingBonificoCount: bonifico._count._all,
      from: from || null,
      to: to || null,
    },
  });
}
