/** ALTER idempotente: stato invio email su NewsletterSubscriber. */
import { prisma } from "../src/lib/prisma";
const COLS: Array<[string, string]> = [
  ["emailStatus", "VARCHAR(16) NULL"],
  ["emailError", "TEXT NULL"],
  ["emailSentAt", "DATETIME(3) NULL"],
];
async function has(c: string) {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='NewsletterSubscriber' AND COLUMN_NAME=?`, c);
  return Number(r[0]?.c || 0) > 0;
}
async function main() {
  for (const [n, t] of COLS) {
    if (await has(n)) { console.log(`✓ ${n} ok`); continue; }
    await prisma.$executeRawUnsafe(`ALTER TABLE \`NewsletterSubscriber\` ADD COLUMN \`${n}\` ${t}`);
    console.log(`+ ${n}`);
  }
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
