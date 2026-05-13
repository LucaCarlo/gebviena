/**
 * Pulisce gli attributi di CAFESTUHL: tiene SOLO l'attributo SEAT.
 *
 * CAFESTUHL ha 2 varianti reali:
 *   - SDCAFELGN  → Seduta = Legno (default)
 *   - SDCAFELTES → Seduta = Imbottita
 *
 * I valori globali nella tabella StoreAttributeValue (Struttura, Imbottitura,
 * Inserti, Variante, ecc.) restano in catalogo per essere usati su ALTRI prodotti
 * — questo script li RIMUOVE solo dalle 2 varianti CAFESTUHL.
 *
 * Inoltre rimuove le 3 opzioni SEAT non presenti su CAFESTUHL (Paglia di Vienna,
 * Traforata, Cotone macramè) → restano nel catalogo ma non sulle varianti.
 *
 * Uso:
 *   npx tsx scripts/cleanup-cafestuhl-attrs.ts            # dry-run
 *   npx tsx scripts/cleanup-cafestuhl-attrs.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// SKU varianti CAFESTUHL e il SEAT che ognuna deve mantenere.
const CAFESTUHL_SEATS: Record<string, string> = {
  SDCAFELGN: "seduta_legno",
  SDCAFELTES: "seduta_imbottita",
};

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "🟢 APPLY" : "🟡 DRY-RUN (passa --apply per scrivere)");

  // Trova varianti CAFESTUHL
  const variants = await prisma.storeProductVariant.findMany({
    where: { sku: { in: Object.keys(CAFESTUHL_SEATS) } },
    select: {
      id: true,
      sku: true,
      attributes: {
        include: { value: { include: { translations: { where: { languageCode: "it" } } } } },
      },
    },
  });

  let removed = 0;
  let kept = 0;
  for (const v of variants) {
    const targetSeatCode = CAFESTUHL_SEATS[v.sku];
    console.log(`\nVariant ${v.sku} (target SEAT = ${targetSeatCode}):`);
    for (const a of v.attributes) {
      const label = a.value.translations[0]?.label || a.value.code;
      const isTargetSeat = a.value.code === targetSeatCode;
      if (isTargetSeat) {
        console.log(`  ✓ KEEP   ${a.value.type.padEnd(15)} ${label}`);
        kept++;
      } else {
        console.log(`  ✗ REMOVE ${a.value.type.padEnd(15)} ${label}`);
        if (apply) {
          await prisma.storeProductVariantAttribute.delete({
            where: { variantId_valueId: { variantId: v.id, valueId: a.valueId } },
          });
        }
        removed++;
      }
    }
  }

  console.log("");
  console.log("════════════════════════════════════════════════════");
  console.log(`  Mantenuti su CAFESTUHL: ${kept} attributi (solo SEAT)`);
  console.log(`  Rimossi:                ${removed}`);
  console.log(`  Valori globali nel catalogo:  intatti (disponibili per altri prodotti)`);
  console.log(`  ${apply ? "✓ Scritto" : "⚠ DRY-RUN"}`);
  console.log("════════════════════════════════════════════════════");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
