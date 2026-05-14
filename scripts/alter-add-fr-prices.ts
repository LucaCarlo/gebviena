/**
 * Aggiunge le colonne priceFrCents / salePriceFrCents a StoreProductVariant.
 * Idempotente: skippa se le colonne esistono già.
 *
 * Eseguire una volta su dev e una volta su prod:
 *   npx tsx scripts/alter-add-fr-prices.ts
 */
import { prisma } from "../src/lib/prisma";

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ c: number | bigint }>>(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
    table,
    column,
  );
  const c = rows[0]?.c;
  return Number(c) > 0;
}

async function main() {
  const table = "StoreProductVariant";
  for (const col of ["priceFrCents", "salePriceFrCents"]) {
    if (await columnExists(table, col)) {
      console.log(`✓ Column ${table}.${col} already exists, skipping`);
      continue;
    }
    const sql = `ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` INT NULL AFTER \`salePriceCents\``;
    console.log(`→ ${sql}`);
    await prisma.$executeRawUnsafe(sql);
    console.log(`✓ Added ${table}.${col}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
