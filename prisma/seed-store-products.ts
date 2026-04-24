import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Crea uno StoreProduct (con 1 variante default vuota, isPublished=false)
 * per ogni Product.isActive=true che non ne ha ancora uno.
 *
 * Idempotente: lascia intatti gli StoreProduct già esistenti.
 */

function buildSku(slug: string, suffix = "default"): string {
  // sku max 64 char. Lascio 8 char per il suffix + 1 per "-"
  const base = slug.slice(0, 64 - suffix.length - 1);
  return `${base}-${suffix}`;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  let created = 0;
  let skipped = 0;

  for (const p of products) {
    const existing = await prisma.storeProduct.findUnique({
      where: { productId: p.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.storeProduct.create({
      data: {
        productId: p.id,
        isPublished: false,
        sortOrder: 0,
        variants: {
          create: {
            sku: buildSku(p.slug),
            priceCents: 0,
            stockQty: null,
            trackStock: false,
            volumeM3: 0,
            shippingClass: "STANDARD",
            isDefault: true,
            isPublished: false,
            sortOrder: 0,
          },
        },
      },
    });
    created++;
  }

  console.log(`✓ StoreProduct: ${created} creati, ${skipped} già esistenti (${products.length} Product attivi)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
