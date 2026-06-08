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
 * Risposta:
 * - totalSalesCents: somma totalCents di TUTTI gli ordini "vendita" del periodo
 *     (include PENDING/bonifico ancora da incassare) MENO i rimborsi
 *     (refundAmountCents). Esclude CANCELLED. È il numero "vero" della
 *     performance economica.
 * - totalSalesCount: numero ordini considerati nel totale vendite.
 * - cancelledRefundedCents/Count: importo annullati (totalCents CANCELLED) +
 *     rimborsi (refundAmountCents REFUNDED/PARTIALLY_REFUNDED).
 *
 * Globali (stato corrente, non filtrati per data):
 * - pendingBonifico (count + cents): ordini PENDING in attesa bonifico.
 * - daEvadereCount/shippedCount/consegnatiCount: stato operativo corrente.
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

  // Tutte le "vendite" del periodo: include PENDING (ordine fatto ma non ancora
  // pagato — es. bonifico in attesa), pagati, in evasione, completati, e anche
  // i rimborsati (il lordo entra; sotto sottraggo refundAmountCents). Esclude
  // CANCELLED (mai diventato vendita).
  const vendute = await prisma.order.aggregate({
    where: {
      ...dateFilter,
      status: { in: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUNDED", "PARTIALLY_REFUNDED"] },
    },
    _sum: { totalCents: true },
    _count: { _all: true },
  });

  // Rimborsi: importo effettivamente rimborsato nel periodo.
  const rimborsati = await prisma.order.aggregate({
    where: {
      ...dateFilter,
      status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
    },
    _sum: { refundAmountCents: true },
    _count: { _all: true },
  });

  // Annullati: ordini CANCELLED nel periodo.
  const annullati = await prisma.order.aggregate({
    where: { ...dateFilter, status: "CANCELLED" },
    _sum: { totalCents: true },
    _count: { _all: true },
  });

  // Conteggi globali per stato — NON filtrati per data: rappresentano lo
  // stato corrente del sistema (es. "Da evadere: 12" = 12 ordini ancora da
  // spedire indipendentemente da quando sono stati creati).
  const globalGroups = await prisma.order.groupBy({
    by: ["status", "paymentProvider"],
    _count: { _all: true },
  });
  let bonificoPending = 0;
  let daEvadere = 0;
  let spediti = 0;
  let consegnati = 0;
  for (const g of globalGroups) {
    const n = g._count._all;
    if (g.status === "PENDING" && g.paymentProvider === "bonifico") bonificoPending += n;
    else if (g.status === "PAID" || g.status === "PROCESSING") daEvadere += n;
    else if (g.status === "SHIPPED") spediti += n;
    else if (g.status === "DELIVERED") consegnati += n;
  }

  // Totale € in attesa di bonifico (globale).
  const bonifico = await prisma.order.aggregate({
    where: { status: "PENDING", paymentProvider: "bonifico" },
    _sum: { totalCents: true },
  });

  const grossSalesCents = vendute._sum.totalCents || 0;
  const refundsAmountCents = rimborsati._sum.refundAmountCents || 0;
  const cancelledCents = annullati._sum.totalCents || 0;

  const totalSalesCents = grossSalesCents - refundsAmountCents;
  const totalSalesCount = vendute._count._all;

  const cancelledRefundedCents = cancelledCents + refundsAmountCents;
  const cancelledRefundedCount = annullati._count._all + rimborsati._count._all;

  return NextResponse.json({
    success: true,
    data: {
      // Per periodo
      totalSalesCents,
      totalSalesCount,
      cancelledRefundedCents,
      cancelledRefundedCount,
      // Globali (stato corrente)
      pendingBonificoCount: bonificoPending,
      pendingBonificoCents: bonifico._sum.totalCents || 0,
      daEvadereCount: daEvadere,
      shippedCount: spediti,
      consegnatiCount: consegnati,
      from: from || null,
      to: to || null,
    },
  });
}
