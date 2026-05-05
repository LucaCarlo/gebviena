/**
 * Per ogni StoreProduct che non ha ancora alcuna variante, crea una variante
 * "Standard" placeholder così il prodotto risulta visibile nello shop.
 *
 *  - sku: <slug>-STD-<short-id>  (unique)
 *  - priceCents: 0  (UI mostra "Prezzo su richiesta" + shippingClass QUOTE_ONLY)
 *  - shippingClass: QUOTE_ONLY  (= "Su preventivo")
 *  - isDefault: true, isPublished: true
 *  - stockQty: null, trackStock: false  (sempre disponibile come placeholder)
 *
 * Idempotente: skippa se il prodotto ha già almeno una variante.
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const storeProducts = await prisma.storeProduct.findMany({
    select: {
      id: true,
      product: { select: { slug: true, name: true } },
      _count: { select: { variants: true } },
    },
  });

  console.log(`Found ${storeProducts.length} StoreProducts`);

  let created = 0, skipped = 0;
  for (const sp of storeProducts) {
    if (sp._count.variants > 0) {
      skipped++;
      continue;
    }

    const slug = sp.product.slug.toUpperCase().replace(/[^A-Z0-9]/g, "-").substring(0, 24);
    const shortId = sp.id.substring(sp.id.length - 6).toUpperCase();
    const sku = `${slug}-STD-${shortId}`;

    await prisma.storeProductVariant.create({
      data: {
        storeProductId: sp.id,
        sku,
        priceCents: 0, // 0 = "Su richiesta" (rendered as such in the UI)
        stockQty: null,
        trackStock: false,
        weightKg: null,
        volumeM3: 0,
        shippingClass: "QUOTE_ONLY",
        isDefault: true,
        isPublished: true,
      },
    });

    await prisma.storeProductVariantTranslation.create({
      data: {
        variantId: (await prisma.storeProductVariant.findUnique({ where: { sku }, select: { id: true } }))!.id,
        languageCode: "it",
        name: "Standard",
        description: "Versione standard. Contattaci per finiture personalizzate e preventivo.",
      },
    });

    created++;
    if (created % 20 === 0) console.log(`  ... ${created} created so far`);
  }

  console.log("");
  console.log(`✅ DONE`);
  console.log(`   Default variants created: ${created}`);
  console.log(`   Skipped (already had variants): ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
