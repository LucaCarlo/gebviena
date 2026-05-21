/** Crea la tabella Cart se non esiste. */
import { prisma } from "../src/lib/prisma";

async function tableExists(name: string): Promise<boolean> {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?`, name);
  return Number(r[0]?.c || 0) > 0;
}

async function main() {
  if (await tableExists("Cart")) {
    console.log("✓ Cart già esistente");
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`Cart\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`sessionId\` VARCHAR(64) NOT NULL,
        \`customerId\` VARCHAR(191) NULL,
        \`email\` VARCHAR(191) NULL,
        \`items\` TEXT NOT NULL,
        \`subtotalCents\` INT NOT NULL DEFAULT 0,
        \`currency\` VARCHAR(3) NOT NULL DEFAULT 'EUR',
        \`itemCount\` INT NOT NULL DEFAULT 0,
        \`language\` VARCHAR(8) NULL,
        \`userAgent\` TEXT NULL,
        \`ipAddress\` VARCHAR(64) NULL,
        \`converted\` TINYINT(1) NOT NULL DEFAULT 0,
        \`convertedOrderId\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`Cart_sessionId_key\` (\`sessionId\`),
        KEY \`Cart_updatedAt_idx\` (\`updatedAt\`),
        KEY \`Cart_converted_idx\` (\`converted\`),
        KEY \`Cart_email_idx\` (\`email\`),
        KEY \`Cart_customerId_idx\` (\`customerId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("+ Cart creata");
  }
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
