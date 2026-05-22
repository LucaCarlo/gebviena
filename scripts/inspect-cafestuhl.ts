import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Variants CAFESTUHL con attributi e dimensioni
  const variants = await prisma.storeProductVariant.findMany({
    where: { sku: { in: ["SDCAFELGN", "SDCAFELTES"] } },
    include: {
      attributes: { include: { value: { include: { translations: true } } } },
      translations: { where: { languageCode: "it" } },
    },
  });
  console.log("=== CAFESTUHL Variants ===");
  for (const v of variants) {
    console.log(`\nVariant sku=${v.sku} priceCents=${v.priceCents} salePrice=${v.salePriceCents} dimBlock=${v.dimensionBlockId} dimValues=${v.dimensionValues}`);
    console.log(`  name=${v.translations[0]?.name?.slice(0,80) || "(no tr)"}`);
    console.log(`  attributi (${v.attributes.length}):`);
    for (const a of v.attributes) {
      const it = a.value.translations.find((t) => t.languageCode === "it");
      console.log(`    - type=${a.value.type} code=${a.value.code} label=${it?.label}`);
    }
  }

  // Tutti gli StoreAttributeValue gia' esistenti
  console.log("\n\n=== StoreAttributeValue esistenti (raggruppati per type) ===");
  const allValues = await prisma.storeAttributeValue.findMany({
    include: { translations: { where: { languageCode: "it" } } },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });
  const grouped: Record<string, string[]> = {};
  for (const v of allValues) {
    const label = v.translations[0]?.label || v.code;
    if (!grouped[v.type]) grouped[v.type] = [];
    grouped[v.type].push(`${label} (code=${v.code})`);
  }
  for (const [type, labels] of Object.entries(grouped)) {
    console.log(`  ${type}: ${labels.length} valori`);
    for (const l of labels) console.log(`    - ${l}`);
  }

  // DimensionBlock per CAFESTUHL se c'è
  if (variants[0]?.dimensionBlockId) {
    const block = await prisma.dimensionBlock.findUnique({ where: { id: variants[0].dimensionBlockId } });
    console.log("\n=== DimensionBlock di CAFESTUHL ===");
    console.log(`  name=${block?.name} labels=${block?.labels}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
