import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeConfig } from "@/lib/stripe-config";
import { sendOrderConfirmationEmail } from "@/lib/order-email";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// Stripe richiede il body raw per la verifica firma.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cfg = await getStripeConfig();
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  // Sicurezza: senza webhook secret o senza firma NON ci si fida del body.
  // (La promozione dell'ordine avviene comunque in modo sicuro dal fallback
  // order-status, che interroga Stripe direttamente con la secret key.)
  if (!cfg.webhookSecret || !sig) {
    console.error("[stripe-webhook] rifiutato: webhook secret o firma mancanti");
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, cfg.webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-webhook] signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook signature failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const order = await prisma.order.findUnique({
          where: { stripePaymentIntentId: pi.id },
          include: { items: true },
        });
        if (!order) {
          console.warn("[stripe-webhook] no order for PI", pi.id);
          break;
        }
        if (order.status === "PAID") break; // idempotenza

        let promoted = false;
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.order.findUnique({ where: { id: order.id }, select: { status: true } });
          if (fresh?.status !== "PENDING") return; // race con order-status fallback
          await tx.order.update({
            where: { id: order.id },
            data: { status: "PAID", paidAt: new Date() },
          });
          // Decrementa stock
          for (const item of order.items) {
            if (!item.variantId) continue;
            const v = await tx.storeProductVariant.findUnique({ where: { id: item.variantId } });
            if (v && v.trackStock && v.stockQty !== null) {
              await tx.storeProductVariant.update({
                where: { id: item.variantId },
                data: { stockQty: Math.max(0, v.stockQty - item.quantity) },
              });
            }
          }
          promoted = true;
        });
        console.log("[stripe-webhook] order PAID:", order.orderNumber, promoted ? "(promoted)" : "(already paid)");

        // Conferma ordine: HTML personalizzato + PDF allegato. Solo se è
        // questo path che ha effettivamente promosso (no doppia email).
        if (promoted) {
          sendOrderConfirmationEmail(order.id).catch((err) => {
            console.error("[stripe-webhook] sendOrderConfirmationEmail error:", err);
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const err = pi.last_payment_error;
        const msg = err
          ? [err.code, err.decline_code, err.message].filter(Boolean).join(" · ").slice(0, 500)
          : null;
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: pi.id, status: { in: ["PENDING", "ABANDONED_CHECKOUT"] } },
          data: { status: "PAYMENT_FAILED", paymentErrorMessage: msg },
        });
        console.log("[stripe-webhook] PI failed:", pi.id, "·", msg);
        break;
      }

      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: pi.id, status: { in: ["PENDING", "ABANDONED_CHECKOUT", "PAYMENT_FAILED"] } },
          data: { status: "CANCELLED" },
        });
        console.log("[stripe-webhook] PI canceled:", pi.id);
        break;
      }

      case "charge.refunded":
      case "charge.dispute.created":
        // gestione rimborsi/dispute (skip per MVP)
        break;

      default:
        // event non gestito
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-webhook] handler error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
