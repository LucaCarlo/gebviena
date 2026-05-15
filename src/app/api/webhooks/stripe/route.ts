import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeConfig } from "@/lib/stripe-config";
import { sendOrderConfirmationEmail } from "@/lib/order-email";
import { requestMagicLink } from "@/lib/customer-magic-link";
import type Stripe from "stripe";

async function maybeSendWelcomeMagicLink(orderId: string, origin: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { customerId: true, email: true, customer: { select: { passwordHash: true } } },
  });
  if (!order) return;
  // Mandiamo il magic-link SOLO ai customer senza password — è il caso del nuovo
  // cliente che ha appena fatto il primo ordine. Quelli che già accedono con
  // password non ricevono nulla, hanno già il loro account.
  if (order.customer && order.customer.passwordHash) return;
  await requestMagicLink({ email: order.email, origin, purpose: "magic_link" }).catch((err) => {
    console.error("[welcome-magic-link] error:", err);
  });
}

export const dynamic = "force-dynamic";

// Stripe richiede il body raw per la verifica firma.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cfg = await getStripeConfig();
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (cfg.webhookSecret && sig) {
      const stripe = await getStripe();
      event = stripe.webhooks.constructEvent(rawBody, sig, cfg.webhookSecret);
    } else {
      // Fallback dev: niente webhook secret → fidati del body (solo per test locale)
      event = JSON.parse(rawBody) as Stripe.Event;
    }
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
          // 2a email: magic-link per accedere all'area riservata (solo se nuovo).
          const origin = req.nextUrl.origin;
          maybeSendWelcomeMagicLink(order.id, origin).catch((err) => {
            console.error("[stripe-webhook] welcome magic-link error:", err);
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: pi.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        console.log("[stripe-webhook] PI failed:", pi.id);
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
