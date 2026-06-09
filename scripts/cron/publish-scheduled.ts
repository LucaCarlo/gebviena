// Pubblica i contenuti con scheduledPublishAt <= NOW() e isActive=false.
// Eseguito ogni 5 min via systemd timer.
import { prisma } from "@/lib/prisma";

async function main() {
  const now = new Date();
  let total = 0;
  const tables = ["product", "designer", "project", "campaign", "award", "catalog"] as const;
  for (const t of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = (prisma as any)[t];
    const res = await m.updateMany({
      where: { isActive: false, scheduledPublishAt: { not: null, lte: now } },
      data: { isActive: true, scheduledPublishAt: null },
    });
    if (res.count > 0) console.log(`[${t}] pubblicati: ${res.count}`);
    total += res.count;
  }
  console.log(`[done] ${total} contenuti pubblicati`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
