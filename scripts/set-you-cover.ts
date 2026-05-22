/* Setta cover di YOU CHAIR (StoreProduct + Product) all'immagine appena uploadata.
   Uso: npx tsx set-you-cover.ts <imagePath>
*/
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const url = process.argv[2];
  if (!url) { console.error("Usage: npx tsx set-you-cover.ts <imagePath>"); process.exit(1); }

  // Trova lo storeProduct canonical di YOU CHAIR via SKU SDYOUCLGN (codice Excel)
  const variant = await prisma.storeProductVariant.findUnique({
    where: { sku: "SDYOUCLGN" },
    select: { storeProductId: true, storeProduct: { select: { id: true, productId: true } } },
  });
  if (!variant) { console.error("Variante SDYOUCLGN non trovata"); process.exit(1); }

  await prisma.storeProduct.update({
    where: { id: variant.storeProductId },
    data: { coverImage: url },
  });
  console.log("✓ StoreProduct.coverImage aggiornato per YOU CHAIR (storeProductId=" + variant.storeProductId + ")");

  // Setta anche il Product.coverImage e imageUrl se vuoti
  const prod = await prisma.product.findUnique({ where: { id: variant.storeProduct.productId } });
  if (prod) {
    const updates: { coverImage?: string; imageUrl?: string; heroImage?: string; sideImage?: string } = {};
    if (!prod.coverImage) updates.coverImage = url;
    if (!prod.imageUrl) updates.imageUrl = url;
    if (!prod.heroImage) updates.heroImage = url;
    if (!prod.sideImage) updates.sideImage = url;
    if (Object.keys(updates).length > 0) {
      await prisma.product.update({ where: { id: prod.id }, data: updates });
      console.log("✓ Product (" + prod.slug + ") aggiornato:", Object.keys(updates).join(", "));
    } else {
      console.log("✓ Product (" + prod.slug + ") già ha cover/imageUrl/hero/side — nulla da aggiornare");
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
