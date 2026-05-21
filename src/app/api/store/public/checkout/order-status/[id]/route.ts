import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe-config";
import { sendOrderConfirmationEmail } from "@/lib/order-email";

export const dynamic = "force-dynamic";

/**
 * Endpoint pubblico (no auth) usato dalla success page subito dopo il pagamento.
 * Fa da fallback nel caso il webhook Stripe non sia arrivato/configurato:
 * se l'ordine è ancora PENDING e ha uno stripePaymentIntentId, interroga Stripe
 * direttamente e — se il PI è succeeded — promuove l'ordine a PAID.
 *
 * Restituisce solo dati non sensibili (orderNumber, status, email, totale).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      email: true,
      totalCents: true,
      currency: true,
      stripePaymentIntentId: true,
      paymentProvider: true,
      language: true,
      items: { select: { variantId: true, quantity: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });
  }

  // Fallback: se ancora PENDING, interroga Stripe e promuovi
  if (order.status === "PENDING" && order.stripePaymentIntentId) {
    try {
      const stripe = await getStripe();
      const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);

      if (pi.status === "succeeded") {
        // Estrai paymentMethodType
        const piExpanded = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, { expand: ["latest_charge"] }).catch(() => null);
        const charge = piExpanded?.latest_charge && typeof piExpanded.latest_charge !== "string" ? piExpanded.latest_charge : null;
        const methodType = charge?.payment_method_details?.type || piExpanded?.payment_method_types?.[0] || null;
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.order.findUnique({ where: { id: order.id }, select: { status: true } });
          if (fresh?.status !== "PENDING") return; // race con webhook → ok
          await tx.order.update({
            where: { id: order.id },
            data: { status: "PAID", paidAt: new Date(), paymentMethodType: methodType || undefined },
          });
          for (const it of order.items) {
            if (!it.variantId) continue;
            const v = await tx.storeProductVariant.findUnique({ where: { id: it.variantId } });
            if (v && v.trackStock && v.stockQty !== null) {
              await tx.storeProductVariant.update({
                where: { id: it.variantId },
                data: { stockQty: Math.max(0, v.stockQty - it.quantity) },
              });
            }
          }
        });
        order.status = "PAID";
      } else if (pi.status === "canceled" || pi.status === "requires_payment_method") {
        // requires_payment_method dopo un decline definitivo → annulla
        if (pi.last_payment_error) {
          await prisma.order.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: { status: "CANCELLED" },
          });
          order.status = "CANCELLED";
        }
      }
    } catch (e) {
      // Errore Stripe non blocca: restituiamo lo stato corrente
      console.warn("[order-status] stripe lookup failed:", e);
    }
  }

  // Garanzia consegna email: ogni volta che la success-page interroga lo
  // stato, se l'ordine è PAID tentiamo l'invio. sendOrderConfirmationEmail
  // è idempotente (flag confirmationEmailSentAt) quindi parte UNA volta sola,
  // ma viene ritentata finché non riesce — anche se il webhook ha fallito.
  if (order.status === "PAID") {
    sendOrderConfirmationEmail(order.id).catch((err) => {
      console.error("[order-status] sendOrderConfirmationEmail error:", err);
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      email: order.email,
      totalCents: order.totalCents,
      currency: order.currency,
      paymentProvider: order.paymentProvider || null,
      language: order.language || "it",
    },
  });
}
