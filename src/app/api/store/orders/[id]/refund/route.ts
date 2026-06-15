import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { getStripe } from "@/lib/stripe-config";
import { OrderStatus } from "@prisma/client";

/**
 * POST /api/store/orders/:id/refund
 * Body: { amountCents?: number, reason?: string }
 *
 * Esegue il rimborso. Se l'ordine è stato pagato tramite Stripe (PaymentIntent
 * presente, es. carta) il rimborso viene eseguito automaticamente su Stripe
 * (stripe.refunds.create) e l'importo torna sul metodo di pagamento del cliente.
 * Per pagamenti non-Stripe (es. bonifico) il rimborso viene solo registrato:
 * l'operatore lo esegue manualmente.
 *
 * Gate: store_orders.edit (chi gestisce gli ordini può rimborsare). Il catalogo
 * permessi non prevede un'azione "refund" dedicata.
 */

// Stati per cui ha senso un rimborso (denaro effettivamente incassato).
const REFUNDABLE_STATUSES: OrderStatus[] = [
  "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP", "PARTIALLY_REFUNDED",
];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_orders", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json().catch(() => ({}));
    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });

    if (!REFUNDABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { success: false, error: "Questo ordine non è in uno stato rimborsabile" },
        { status: 400 }
      );
    }

    const alreadyRefunded = order.refundAmountCents ?? 0;
    const maxRefundable = order.totalCents - alreadyRefunded;
    if (maxRefundable <= 0) {
      return NextResponse.json({ success: false, error: "Ordine già interamente rimborsato" }, { status: 400 });
    }

    const requested = Number.isFinite(body.amountCents)
      ? Math.max(0, Math.trunc(body.amountCents))
      : maxRefundable;
    if (requested <= 0) {
      return NextResponse.json({ success: false, error: "Importo rimborso non valido" }, { status: 400 });
    }
    if (requested > maxRefundable) {
      return NextResponse.json(
        { success: false, error: "L'importo supera il rimborsabile residuo" },
        { status: 400 }
      );
    }

    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    const newTotalRefunded = alreadyRefunded + requested;
    const isFull = newTotalRefunded >= order.totalCents;

    let stripeRefundId = order.stripeRefundId ?? null;
    let viaStripe = false;

    // Rimborso automatico su Stripe solo se pagato con Stripe (PI presente).
    if (order.stripePaymentIntentId) {
      const stripe = await getStripe();
      const refund = await stripe.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: requested,
          metadata: {
            orderNumber: order.orderNumber,
            adminReason: reason ?? "",
          },
        },
        // Evita doppi rimborsi su doppio click: chiave stabile per questa operazione.
        { idempotencyKey: `refund-${order.id}-${alreadyRefunded}-${requested}` }
      );
      stripeRefundId = refund.id;
      viaStripe = true;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        refundedAt: new Date(),
        refundAmountCents: newTotalRefunded,
        refundReason: reason,
        stripeRefundId,
        status: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      note: viaStripe
        ? (isFull
            ? "Rimborso totale eseguito su Stripe. L'importo torna sul metodo di pagamento del cliente."
            : "Rimborso parziale eseguito su Stripe.")
        : "Rimborso registrato. Pagamento non tramite Stripe (es. bonifico): esegui il rimborso manualmente al cliente.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
