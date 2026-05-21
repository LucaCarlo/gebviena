/** Estende l'enum OrderStatus con i nuovi valori. Idempotente. */
import { prisma } from "../src/lib/prisma";

const ENUM_DEF = "ENUM('PENDING','ABANDONED_CHECKOUT','PAYMENT_FAILED','CANCELLED','PAID','PROCESSING','SHIPPED','DELIVERED','PICKED_UP','RETURNED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING'";

async function main() {
  // Verifica i valori attuali dell'enum
  const rows = await prisma.$queryRawUnsafe<Array<{ COLUMN_TYPE: string }>>(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Order' AND COLUMN_NAME='status'`
  );
  const current = rows[0]?.COLUMN_TYPE || "";
  const missing = ["ABANDONED_CHECKOUT", "PAYMENT_FAILED", "PICKED_UP", "RETURNED"].filter((v) => !current.includes(`'${v}'`));

  if (missing.length === 0) {
    console.log("✓ enum OrderStatus già esteso, niente da fare");
  } else {
    console.log(`+ aggiungo valori enum: ${missing.join(", ")}`);
    await prisma.$executeRawUnsafe(`ALTER TABLE \`Order\` MODIFY COLUMN \`status\` ${ENUM_DEF}`);
    console.log("+ enum aggiornato");
  }
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
