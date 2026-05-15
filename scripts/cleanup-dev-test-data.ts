/**
 * SOLO DEV — pulizia dati di test.
 *  - Cancella TUTTI gli Order (sono ordini di test su dev) + OrderItem (cascade).
 *  - Cancella i Customer indicati (+ token/favorites/addresses in cascade).
 *
 * Stampa un report prima e dopo. NON eseguire su prod.
 *   npx tsx scripts/cleanup-dev-test-data.ts
 */
import { prisma } from "../src/lib/prisma";

const CUSTOMERS_TO_DELETE = [
  "lucacarlorecchio2502@gmail.com",
  "lucacarlorecchio25@gmail.com",
];

async function main() {
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true, email: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Ordini presenti: ${orders.length}`);
  for (const o of orders) {
    console.log(`  ${o.orderNumber}  ${o.status}  ${o.email}  ${o.createdAt.toISOString()}`);
  }

  if (orders.length > 0) {
    const delItems = await prisma.orderItem.deleteMany({});
    const delOrders = await prisma.order.deleteMany({});
    console.log(`✓ Cancellati ${delOrders.count} ordini e ${delItems.count} righe ordine`);
  }

  for (const email of CUSTOMERS_TO_DELETE) {
    const c = await prisma.customer.findUnique({ where: { email } });
    if (!c) {
      console.log(`· Customer ${email} non trovato (ok)`);
      continue;
    }
    await prisma.customer.delete({ where: { id: c.id } });
    console.log(`✓ Cancellato customer ${email} (+ token/preferiti/indirizzi in cascade)`);
  }

  const remaining = await prisma.order.count();
  console.log(`\nOrdini rimasti: ${remaining}`);
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
