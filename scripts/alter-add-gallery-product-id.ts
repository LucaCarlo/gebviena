/** Aggiunge StoreProduct.galleryProductId se mancante. Idempotente. */
import { prisma } from "../src/lib/prisma";

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ c: number | bigint }>>(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table, column,
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function main() {
  const table = "StoreProduct";
  const col = "galleryProductId";
  if (await columnExists(table, col)) { console.log(`✓ ${table}.${col} esiste già`); return; }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` VARCHAR(191) NULL AFTER \`excludedCatalogImages\``,
  );
  console.log(`✓ Aggiunta colonna ${table}.${col}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
