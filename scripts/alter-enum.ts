/**
 * ALTER del MySQL enum StoreAttributeValue.type per aggiungere nuovi valori
 * (STRUCTURE, SEAT, UPHOLSTERY, INSERT, CONFIGURATION) senza usare prisma db push
 * (che ha drift su campi non correlati).
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Eseguo ALTER TABLE StoreAttributeValue MODIFY type ENUM(...)...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`StoreAttributeValue\`
    MODIFY \`type\` ENUM('MATERIAL','FINISH','COLOR','STRUCTURE','SEAT','UPHOLSTERY','INSERT','CONFIGURATION','OTHER') NOT NULL
  `);
  console.log("✓ Enum aggiornato. Ora il client Prisma deve essere rigenerato e l'app riavviata.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
