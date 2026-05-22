/** Aggiunge Order.paymentMethodType + popola per ordini PAID storici via Stripe. */
import { prisma } from "../src/lib/prisma";
import { getStripe } from "../src/lib/stripe-config";

async function ensureColumn() {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Order' AND COLUMN_NAME='paymentMethodType'`,
  );
  if (Number(r[0]?.c || 0) > 0) {
    console.log("✓ paymentMethodType già presente");
  } else {
    await prisma.$executeRawUnsafe("ALTER TABLE `Order` ADD COLUMN `paymentMethodType` VARCHAR(32) NULL AFTER `paymentProvider`");
    console.log("+ paymentMethodType aggiunta");
  }
}

async function main() {
  await ensureColumn();

  const orders = await prisma.order.findMany({
    where: { paymentProvider: "stripe", paymentMethodType: null, stripePaymentIntentId: { not: null } },
    select: { id: true, orderNumber: true, stripePaymentIntentId: true },
  });
  console.log(`Backfill su ${orders.length} ordini Stripe senza paymentMethodType`);

  if (orders.length === 0) return;
  const stripe = await getStripe();

  for (const o of orders) {
    try {
      const pi = await stripe.paymentIntents.retrieve(o.stripePaymentIntentId!, { expand: ["latest_charge"] });
      const charge = pi.latest_charge && typeof pi.latest_charge !== "string" ? pi.latest_charge : null;
      const type = charge?.payment_method_details?.type
        || (typeof pi.payment_method_types?.[0] === "string" ? pi.payment_method_types[0] : null)
        || null;
      if (type) {
        await prisma.order.update({ where: { id: o.id }, data: { paymentMethodType: type } });
        console.log(`  ${o.orderNumber} → ${type}`);
      } else {
        console.log(`  ${o.orderNumber} → (nessun method type trovato)`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ${o.orderNumber} → Stripe err: ${msg.slice(0, 100)}`);
    }
  }
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
