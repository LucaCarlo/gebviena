import { prisma } from "../src/lib/prisma";

async function main() {
  const sections: Array<[string, { count: (args: { where: { languageCode: string } }) => Promise<number> }]> = [
    ["attrs", prisma.storeAttributeValueTranslation],
    ["cats",  prisma.storeCategoryTranslation],
    ["prods", prisma.storeProductTranslation],
    ["vars",  prisma.storeProductVariantTranslation],
  ];
  for (const [label, model] of sections) {
    const it = await model.count({ where: { languageCode: "it" } });
    const fr = await model.count({ where: { languageCode: "fr" } });
    console.log(`${label.padEnd(6)} IT=${it.toString().padStart(4)}  FR=${fr.toString().padStart(4)}`);
  }
}
main().finally(() => prisma.$disconnect());
