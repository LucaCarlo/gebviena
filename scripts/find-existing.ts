import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// I 12 raggruppamenti dove il mio import ha creato Product nuovi con -2 suffix
// (perche' findOrCreateProduct non e' riuscita a matchare l'esistente).
// Provo a trovare il Product esistente nel catalogo per ognuno.
const TARGETS = [
  { group: "CAFESTUHL", patterns: ["cafestuhl", "café", "caféstuhl"] },
  { group: "N.14", patterns: ["N.14", "N. 14", "N14", "no.14"] },
  { group: "N.18", patterns: ["N.18", "N. 18", "N18", "no.18"] },
  { group: "N.200", patterns: ["N.200", "N. 200", "N200"] },
  { group: "N.811", patterns: ["N.811", "N. 811", "N811", "811"] },
  { group: "SOLDEN", patterns: ["solden", "sölden"] },
  { group: "MOS BENCH (senza cuscino)", patterns: ["mos bench"] },
  { group: "MOS BENCH (con cuscino corto)", patterns: ["mos bench"] },
  { group: "MOS BENCH (con cuscino lungo)", patterns: ["mos bench"] },
  { group: "MAGISTRETTI 0301", patterns: ["0301", "magistretti"] },
  { group: "LOOP INDIA MAHDAVI", patterns: ["loop", "mahdavi"] },
];

async function main() {
  for (const t of TARGETS) {
    const matches = await prisma.product.findMany({
      where: {
        OR: t.patterns.flatMap((p) => [
          { name: { contains: p } },
          { slug: { contains: p.toLowerCase().replace(/\./g, "-").replace(/\s+/g, "-") } },
        ]),
      },
      select: { id: true, name: true, slug: true, designerId: true, designerName: true, storeProduct: { select: { id: true } } },
    });
    console.log(`\n=== ${t.group} ===`);
    if (matches.length === 0) {
      console.log("  (no match)");
      continue;
    }
    for (const m of matches) {
      const hasStore = m.storeProduct ? "✓ storeProduct" : "✗ no storeProduct";
      console.log(`  ${m.name.padEnd(45)} slug=${m.slug.padEnd(25)} designer=${m.designerName.padEnd(25)} (id=${m.designerId || "NULL"}) · ${hasStore}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
