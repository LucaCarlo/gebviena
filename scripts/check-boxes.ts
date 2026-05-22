import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sps = await prisma.storeProduct.findMany({
    where: {
      AND: [
        { isPublished: true },
        { variants: { some: { sku: { in: ["SDCAFELGN","SDN014LGN","SATRIOLGN","SAV144LGN","SDYOUCLGN","CHVALELGN","SDSUGILGN","SDRADELGN"] } } } },
      ],
    },
    select: {
      productsPerBox: true,
      translations: { where: { languageCode: "it" }, select: { name: true } },
      variants: { select: { sku: true }, take: 1 },
    },
  });
  for (const sp of sps) {
    console.log(`${(sp.translations[0]?.name || "?").padEnd(30)} · productsPerBox=${sp.productsPerBox}  · sku=${sp.variants[0]?.sku}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
