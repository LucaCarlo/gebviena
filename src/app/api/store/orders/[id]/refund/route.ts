import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

/**
 * POST /api/store/orders/:id/refund
 * Body: { amountCents?: number, reason?: string }
 *
 * Placeholder: registra il refund come metadata sull'ordine e aggiorna lo stato.
 * L'esecuzione vera tramite Stripe (stripe.refunds.create) verrà aggiunta nella
 * fase "Stripe runtime", quando le chiavi API saranno in Setting.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_orders", "refund");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });

    const requested = Number.isFinite(body.amountCents) ? Math.max(0, Math.trunc(body.amountCents)) : order.totalCents;
    if (requested > order.totalCents) {
      return NextResponse.json({ success: false, error: "Importo refund supera il totale" }, { status: 400 });
    }

    const reason = body.reason ? String(body.reason) : null;
    const isFull = requested >= order.totalCents;

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        refundedAt: new Date(),
        refundAmountCents: requested,
        refundReason: reason,
        status: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      note: "Refund registrato localmente. Chiamata a Stripe non ancora integrata — esegui il refund manuale in dashboard Stripe se necessario.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
