/**
 * Importa da scripts/fr-import-data.json (estratto da
 * "PRODOTTI IN VENDITA SPECIALE ONLINE_FRANCIA.xlsx"):
 *  - StoreProductVariant.priceFrCents / salePriceFrCents (per SKU)
 *  - StoreProductVariantTranslation(fr).description (+ name = prima frase)
 *
 * Idempotente. Match per SKU esatto. Report finale.
 *   npx tsx scripts/import-fr-prices.ts [--dry]
 */
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

const DRY = process.argv.includes("--dry");

interface Row {
  sku: string;
  descFr: string | null;
  priceFrCents: number | null;
  salePriceFrCents: number | null;
}

async function main() {
  const data: Row[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "scripts", "fr-import-data.json"), "utf-8"),
  );
  let priced = 0, described = 0, missing = 0;
  const notFound: string[] = [];

  for (const r of data) {
    const v = await prisma.storeProductVariant.findUnique({ where: { sku: r.sku } });
    if (!v) { missing++; notFound.push(r.sku); continue; }

    if (!DRY) {
      await prisma.storeProductVariant.update({
        where: { id: v.id },
        data: {
          priceFrCents: r.priceFrCents,
          salePriceFrCents: r.salePriceFrCents,
        },
      });
    }
    priced++;

    if (r.descFr) {
      const name = r.descFr.split(/[.!?]/)[0].slice(0, 180).trim() || v.sku;
      if (!DRY) {
        const existing = await prisma.storeProductVariantTranslation.findUnique({
          where: { variantId_languageCode: { variantId: v.id, languageCode: "fr" } },
        });
        if (existing) {
          await prisma.storeProductVariantTranslation.update({
            where: { id: existing.id },
            data: { name, description: r.descFr },
          });
        } else {
          await prisma.storeProductVariantTranslation.create({
            data: { variantId: v.id, languageCode: "fr", name, description: r.descFr },
          });
        }
      }
      described++;
    }
  }

  console.log(`${DRY ? "[DRY] " : ""}righe=${data.length} · prezzi FR aggiornati=${priced} · descrizioni FR=${described} · SKU non trovati=${missing}`);
  if (notFound.length) console.log("non trovati:", notFound.join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
