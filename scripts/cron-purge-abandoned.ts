/**
 * Cron giornaliero: cancella i carrelli abbandonati più vecchi di N giorni.
 *
 * Si applica SOLO agli ordini con status ABANDONED_CHECKOUT, PAYMENT_FAILED
 * e PENDING+stripe (= carrelli abbandonati lato admin). NON tocca mai
 * ordini PAID/CANCELLED/PENDING+bonifico/etc.
 *
 * Soglia configurabile da Admin → Impostazioni Store (chiave
 * `abandoned_cart_ttl_days`, default 90). Per disabilitare la pulizia
 * automatica impostare 0.
 */
import { prisma } from "../src/lib/prisma";

const DEFAULT_TTL_DAYS = 90;

async function main() {
  const setting = await prisma.setting.findUnique({ where: { key: "abandoned_cart_ttl_days" } });
  const ttlDays = setting?.value ? parseInt(setting.value, 10) : DEFAULT_TTL_DAYS;
  if (!Number.isFinite(ttlDays) || ttlDays <= 0) {
    console.log(`[purge-abandoned] disabilitato (ttl=${ttlDays})`);
    return;
  }
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

  // Selezione: solo i veri "abbandonati" (pre-pagamento).
  const toDelete = await prisma.order.findMany({
    where: {
      createdAt: { lt: cutoff },
      OR: [
        { status: "ABANDONED_CHECKOUT" },
        { status: "PAYMENT_FAILED" },
        { status: "PENDING", NOT: { paymentProvider: "bonifico" } },
      ],
    },
    select: { id: true, orderNumber: true, status: true, createdAt: true },
  });
  if (!toDelete.length) {
    console.log(`[purge-abandoned] nulla da cancellare (ttl=${ttlDays}gg, cutoff=${cutoff.toISOString()})`);
    return;
  }

  const ids = toDelete.map((o) => o.id);
  // Cancella prima gli OrderItem (FK), poi gli Order.
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  const res = await prisma.order.deleteMany({ where: { id: { in: ids } } });
  // Sgancia il convertedOrderId dei Cart che puntavano a questi ordini.
  await prisma.cart.updateMany({
    where: { convertedOrderId: { in: ids } },
    data: { convertedOrderId: null },
  }).catch(() => { /* silent */ });

  console.log(`[purge-abandoned] cancellati ${res.count} ordini abbandonati (ttl=${ttlDays}gg, cutoff=${cutoff.toISOString()})`);
}
main().catch((e) => { console.error("[purge-abandoned] ERR:", (e as Error).message); process.exit(1); }).finally(() => prisma.$disconnect());
