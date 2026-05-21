/**
 * Migrazione:
 * 1) ALTER Order ADD COLUMN paymentErrorMessage (idempotente)
 * 2) Per ogni Order PENDING con paymentProvider="stripe" (o non bonifico):
 *    - Query Stripe PaymentIntent
 *    - succeeded → PAID
 *    - requires_payment_method + lastError → PAYMENT_FAILED + paymentErrorMessage
 *    - canceled → CANCELLED
 *    - altro → ABANDONED_CHECKOUT
 */
import { prisma } from "../src/lib/prisma";
import { getStripe } from "../src/lib/stripe-config";

async function ensureColumn() {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Order' AND COLUMN_NAME='paymentErrorMessage'`,
  );
  if (Number(r[0]?.c || 0) > 0) {
    console.log("✓ paymentErrorMessage già presente");
  } else {
    await prisma.$executeRawUnsafe("ALTER TABLE `Order` ADD COLUMN `paymentErrorMessage` TEXT NULL AFTER `stripePaymentIntentId`");
    console.log("+ paymentErrorMessage aggiunta");
  }
}

async function main() {
  await ensureColumn();

  const orders = await prisma.order.findMany({
    where: { status: "PENDING", NOT: { paymentProvider: "bonifico" } },
    select: { id: true, orderNumber: true, stripePaymentIntentId: true, email: true, paymentProvider: true },
  });
  console.log(`Trovati ${orders.length} ordini PENDING non-bonifico`);

  if (orders.length === 0) return;
  const stripe = await getStripe();

  for (const o of orders) {
    if (!o.stripePaymentIntentId) {
      // Niente PI → abbandono diretto
      await prisma.order.update({
        where: { id: o.id },
        data: { status: "ABANDONED_CHECKOUT" },
      });
      console.log(`  ${o.orderNumber} → ABANDONED_CHECKOUT (no PI)`);
      continue;
    }
    try {
      const pi = await stripe.paymentIntents.retrieve(o.stripePaymentIntentId);
      const piStatus = pi.status;
      const err = pi.last_payment_error;
      if (piStatus === "succeeded") {
        await prisma.order.update({ where: { id: o.id }, data: { status: "PAID", paidAt: new Date(pi.created * 1000) } });
        console.log(`  ${o.orderNumber} → PAID (Stripe succeeded)`);
      } else if (piStatus === "canceled") {
        await prisma.order.update({ where: { id: o.id }, data: { status: "CANCELLED" } });
        console.log(`  ${o.orderNumber} → CANCELLED (Stripe canceled)`);
      } else if (err) {
        const msg = [err.code, err.decline_code, err.message].filter(Boolean).join(" · ").slice(0, 500);
        await prisma.order.update({ where: { id: o.id }, data: { status: "PAYMENT_FAILED", paymentErrorMessage: msg } });
        console.log(`  ${o.orderNumber} → PAYMENT_FAILED · ${msg.slice(0, 80)}`);
      } else {
        await prisma.order.update({ where: { id: o.id }, data: { status: "ABANDONED_CHECKOUT" } });
        console.log(`  ${o.orderNumber} → ABANDONED_CHECKOUT (PI status=${piStatus})`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ${o.orderNumber} → Stripe error: ${msg.slice(0, 120)} (lascio PENDING)`);
    }
  }
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
