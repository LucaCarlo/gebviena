import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// SKU dell'Excel → group name
const EXCEL_SKUS: Record<string, string> = {
  "CHVALELGN": "ARCH CLOTHES VALET",
  "SDCAFELGN": "CAFESTUHL", "SDCAFELTES": "CAFESTUHL",
  "SDCZECLGN": "CZECH", "SDCZECTES": "CZECH", "PTCZECLGN": "CZECH", "PTCZECTES": "CZECH",
  "CML160LGN": "LADDER", "CML200LGN": "LADDER", "CML250LGN": "LADDER",
  "PLLOOPTES": "LOOP INDIA MAHDAVI", "PTLOOPTES": "LOOP INDIA MAHDAVI",
  "SDMAGILGN": "MAGISTRETTI 0301",
  "CAMAJOPGL": "MAJORDOMO",
  "CNMOSAPGC": "MOS CABINET",
  "CNMOSGPGC": "MOS CONSOLE",
  "LBMOSGPGL": "MOS BOOKCASE",
  "PCMOSGTEP": "MOS BENCH",
  "TBMOSGLGP": "MOS SIDE TABLE",
  "SDN014LGN": "N.14", "SDN014PGL": "N.14", "SDN014TES": "N.14",
  "SDN018LGN": "N.18", "SDN018TES": "N.18", "SAN018LGN": "N.18", "SAN018TES": "N.18",
  "PLN200PGL": "N.200", "PLN200TES": "N.200",
  "PT0811PGL": "N.811", "PT0811TES": "N.811", "SD0811PGL": "N.811", "SD0811TES": "N.811", "SA0811PGL": "N.811", "SA0811TES": "N.811", "SA0811TE2": "N.811",
  "TVPEEALGN": "PEERS", "TVPEEBLGN": "PEERS",
  "SDRADELGN": "RADETZKY",
  "SDSOLDTES": "SOLDEN",
  "SDSUGILGN": "SUGILOO", "SDSUGITE2": "SUGILOO", "PTSUGITE2": "SUGILOO", "PTSUGILGN": "SUGILOO",
  "SATRIOLGN": "TRIO", "SATRIOTES": "TRIO", "SBTRIOLGN": "TRIO", "SBTRIOTES": "TRIO", "SMTRIOLGN": "TRIO", "SMTRIOTES": "TRIO",
  "SAV144LGN": "VIENNA 144", "SAV144PGL": "VIENNA 144", "SAV144TES": "VIENNA 144", "SBV144LGN": "VIENNA 144", "SBV144PGL": "VIENNA 144", "SBV144TES": "VIENNA 144",
  "SDYOUCLGN": "YOU CHAIR",
};

async function main() {
  console.log("=== AUDIT ORFANI/DUPLICATI per ogni gruppo Excel ===");
  const allGroups = Array.from(new Set(Object.values(EXCEL_SKUS)));
  for (const group of allGroups) {
    const groupSkus = Object.entries(EXCEL_SKUS).filter(([_, g]) => g === group).map(([sku]) => sku);
    // Trova il canonical (con SKU Excel)
    const canonicalVars = await prisma.storeProductVariant.findMany({
      where: { sku: { in: groupSkus } },
      select: { storeProductId: true },
    });
    const canonicalSpIds = Array.from(new Set(canonicalVars.map((v) => v.storeProductId)));

    // Trova TUTTI gli storeProduct con nome simile al group (sia translation che Product.name)
    const candidates = await prisma.storeProduct.findMany({
      where: {
        OR: [
          { product: { name: { contains: group } } },
          { translations: { some: { name: { contains: group } } } },
        ],
      },
      include: {
        product: { select: { name: true, slug: true } },
        translations: { where: { languageCode: "it" }, select: { name: true, slug: true } },
        variants: { select: { id: true } },
      },
    });

    console.log(`\n=== ${group} (canonical: ${canonicalSpIds.join(",") || "?"}) ===`);
    for (const sp of candidates) {
      const trName = sp.translations[0]?.name || "(no IT)";
      const isCanonical = canonicalSpIds.includes(sp.id);
      const marker = isCanonical ? "→ CANONICAL" : (sp.isPublished ? "  ALTRO (PUBBLICATO)" : "  ALTRO (offline)");
      console.log(`  ${marker}  id=${sp.id}  product=${sp.product.slug.padEnd(20)}  trName="${trName}"  vars=${sp.variants.length}  pub=${sp.isPublished}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
