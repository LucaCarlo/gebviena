/**
 * Script di migrazione: copia imageUrl → coverImage per i prodotti esistenti.
 * Eseguire con: npx tsx prisma/migrate-images.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      coverImage: null,
      imageUrl: { not: "" },
    },
    select: { id: true, name: true, imageUrl: true },
  });

  console.log(`Trovati ${products.length} prodotti da migrare...`);

  let migrated = 0;
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: {
        coverImage: p.imageUrl,
        heroImage: p.imageUrl,
      },
    });
    migrated++;
    console.log(`  [${migrated}/${products.length}] ${p.name} → coverImage, heroImage = ${p.imageUrl}`);
  }

  console.log(`\nMigrazione completata: ${migrated} prodotti aggiornati.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
