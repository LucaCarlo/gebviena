/**
 * Marca un ordine come PAID e spara Purchase via Meta CAPI.
 * NON invia alcuna email al cliente.
 *
 * Uso: tsx scripts/mark-paid-and-capi.ts <orderNumber>
 */

import { PrismaClient } from "@prisma/client";
import { sendCapiPurchase } from "../src/lib/fb-capi";

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: tsx scripts/mark-paid-and-capi.ts <orderNumber>");
    process.exit(1);
  }

  const order = await prisma.order.findFirst({ where: { orderNumber: arg } });
  if (!order) {
    console.error(`Ordine ${arg} non trovato.`);
    process.exit(1);
  }

  console.log(`Order trovato: ${order.orderNumber}`);
  console.log(`  Email:  ${order.email}`);
  console.log(`  Cliente: ${order.firstName} ${order.lastName}`);
  console.log(`  Totale: €${(order.totalCents / 100).toFixed(2)}`);
  console.log(`  Status attuale: ${order.status}`);
  console.log(`  Provider: ${order.paymentProvider}`);

  if (order.status === "PAID") {
    console.log("Già PAID. Spara comunque CAPI Purchase (idempotente via event_id).");
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    console.log("→ Status aggiornato a PAID");
  }

  console.log("Invio CAPI Purchase a Meta…");
  const ok = await sendCapiPurchase(order.id);
  console.log(ok ? "✓ CAPI Purchase OK" : "✗ CAPI Purchase fallito (vedi log)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
