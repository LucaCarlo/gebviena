/** ALTER idempotente: flag ritiro in negozio su Order. */
import { prisma } from "../src/lib/prisma";
async function has(c: string) {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Order' AND COLUMN_NAME=?`, c);
  return Number(r[0]?.c || 0) > 0;
}
async function main() {
  if (await has("storePickup")) { console.log("✓ storePickup ok"); }
  else {
    await prisma.$executeRawUnsafe("ALTER TABLE `Order` ADD COLUMN `storePickup` TINYINT(1) NOT NULL DEFAULT 0");
    console.log("+ storePickup");
  }
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
