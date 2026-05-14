/**
 * Aggiunge colonna imageUrl (TEXT nullable) a StoreAttributeValue.
 * Idempotente.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const exists = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    `SHOW COLUMNS FROM \`StoreAttributeValue\` LIKE 'imageUrl'`,
  );
  if (Array.isArray(exists) && exists.length > 0) {
    console.log("↪ Colonna imageUrl già presente, skip.");
    return;
  }
  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`StoreAttributeValue\`
    ADD COLUMN \`imageUrl\` TEXT NULL AFTER \`hexColor\`
  `);
  console.log("✓ Aggiunta colonna imageUrl su StoreAttributeValue.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
