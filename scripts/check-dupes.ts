import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TARGETS = [
  "CAFESTUHL", "N.14", "ARCH CLOTHES VALET", "CZECH", "LADDER", "MAGISTRETTI 0301",
  "MAJORDOMO", "N.18", "N.200", "N.811", "PEERS", "RADETZKY", "SOLDEN", "TRIO",
  "VIENNA 144", "YOU CHAIR", "SUGILOO", "LOOP INDIA MAHDAVI",
  "MOS CABINET", "MOS CONSOLE", "MOS BOOKCASE", "MOS SIDE TABLE",
  "MOS BENCH (senza cuscino)", "MOS BENCH (con cuscino corto)", "MOS BENCH (con cuscino lungo)",
];

async function main() {
  console.log("=== AUDIT DUPLICATI STORE PRODUCTS ===");
  for (const name of TARGETS) {
    const sps = await prisma.storeProduct.findMany({
      where: { translations: { some: { name, languageCode: "it" } } },
      include: {
        product: { select: { name: true, slug: true, description: true } },
        translations: { where: { languageCode: "it" }, select: { name: true, slug: true, marketingDescription: true, shortDescription: true } },
        variants: { select: { id: true, sku: true } },
      },
    });
    if (sps.length === 0) {
      console.log(`✗ ${name}: NESSUNO`);
      continue;
    }
    if (sps.length === 1) {
      const sp = sps[0];
      const md = sp.translations[0]?.marketingDescription || "";
      console.log(`✓ ${name.padEnd(36)} → 1 store (slug=${sp.translations[0]?.slug}, prod=${sp.product.slug}, vars=${sp.variants.length}, md=${md.length}c)`);
    } else {
      console.log(`⚠ ${name.padEnd(36)} → ${sps.length} STORE PRODUCTS (DUPLICATI):`);
      for (const sp of sps) {
        const md = sp.translations[0]?.marketingDescription || "";
        console.log(`    - id=${sp.id}  store-slug=${sp.translations[0]?.slug.padEnd(20)}  product=${sp.product.slug.padEnd(18)}  vars=${sp.variants.length}  md=${md.length}c`);
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
