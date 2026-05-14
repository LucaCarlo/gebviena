/**
 * Aggiunge la colonna `listPriceCents` (Int? nullable) a StoreProductVariant.
 * Eseguito al posto di `prisma db push` per evitare drift su altri campi.
 *
 * Uso: npx tsx scripts/alter-add-listPriceCents.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Verifica se la colonna esiste già
  const exists = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    `SHOW COLUMNS FROM \`StoreProductVariant\` LIKE 'listPriceCents'`,
  );
  if (Array.isArray(exists) && exists.length > 0) {
    console.log("↪ Colonna listPriceCents già presente, skip.");
    return;
  }
  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`StoreProductVariant\`
    ADD COLUMN \`listPriceCents\` INT NULL AFTER \`sku\`
  `);
  console.log("✓ Aggiunta colonna listPriceCents su StoreProductVariant.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
