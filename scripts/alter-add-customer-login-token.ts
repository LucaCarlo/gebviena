/**
 * Crea la tabella CustomerLoginToken (magic-link + password-reset).
 * Idempotente: skippa se la tabella esiste già.
 *
 * Eseguire una volta su dev e una volta su prod prima del primo restart:
 *   npx tsx scripts/alter-add-customer-login-token.ts
 */
import { prisma } from "../src/lib/prisma";

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ c: number | bigint }>>(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table,
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function main() {
  const table = "CustomerLoginToken";
  if (await tableExists(table)) {
    console.log(`✓ Table ${table} already exists, skipping`);
    return;
  }
  const sql = `
    CREATE TABLE \`${table}\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`token\` VARCHAR(64) NOT NULL,
      \`customerId\` VARCHAR(191) NOT NULL,
      \`purpose\` VARCHAR(32) NOT NULL DEFAULT 'magic_link',
      \`usesRemaining\` INT NOT NULL DEFAULT 3,
      \`expiresAt\` DATETIME(3) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`lastUsedAt\` DATETIME(3) NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`CustomerLoginToken_token_key\` (\`token\`),
      INDEX \`CustomerLoginToken_customerId_idx\` (\`customerId\`),
      INDEX \`CustomerLoginToken_expiresAt_idx\` (\`expiresAt\`),
      CONSTRAINT \`CustomerLoginToken_customerId_fkey\`
        FOREIGN KEY (\`customerId\`) REFERENCES \`Customer\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
  console.log(`→ creating ${table}`);
  await prisma.$executeRawUnsafe(sql);
  console.log(`✓ Created ${table}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
