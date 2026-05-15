/**
 * Elimina le StoreCategory senza alcun prodotto pubblicato nel proprio
 * sottoalbero (categoria stessa + figlie). Idempotente, mostra report.
 *   npx tsx scripts/cleanup-empty-store-categories.ts [--dry]
 */
import { prisma } from "../src/lib/prisma";

const DRY = process.argv.includes("--dry");

async function main() {
  const cats = await prisma.storeCategory.findMany({
    select: {
      id: true, parentId: true, slug: true,
      translations: { where: { languageCode: "it" }, select: { name: true } },
    },
  });

  // Conteggio prodotti pubblicati (con variante pubblicata) per categoria
  const grouped = await prisma.storeProduct.groupBy({
    by: ["storeCategoryId"],
    where: {
      isPublished: true,
      variants: { some: { isPublished: true } },
      storeCategoryId: { not: null },
    },
    _count: { _all: true },
  });
  const own = new Map<string, number>();
  for (const g of grouped) if (g.storeCategoryId) own.set(g.storeCategoryId, g._count._all);

  // Figli per parent
  const childrenOf = new Map<string, string[]>();
  for (const c of cats) {
    if (c.parentId) {
      const arr = childrenOf.get(c.parentId) || [];
      arr.push(c.id);
      childrenOf.set(c.parentId, arr);
    }
  }

  // Totale ricorsivo nel sottoalbero
  const memo = new Map<string, number>();
  function subtreeCount(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    let tot = own.get(id) || 0;
    for (const ch of childrenOf.get(id) || []) tot += subtreeCount(ch);
    memo.set(id, tot);
    return tot;
  }

  const toDelete = cats.filter((c) => subtreeCount(c.id) === 0);
  console.log(`Categorie totali: ${cats.length} · da eliminare (vuote): ${toDelete.length}`);
  for (const c of toDelete) {
    console.log(`  - ${c.translations[0]?.name || c.slug} (${c.slug})`);
  }

  if (!DRY && toDelete.length) {
    // Cancella prima le figlie poi i parent (ordine per profondità non
    // necessario: onDelete SetNull sulle self-relation, ma evitiamo sorprese)
    const ids = toDelete.map((c) => c.id);
    const res = await prisma.storeCategory.deleteMany({ where: { id: { in: ids } } });
    console.log(`✓ Eliminate ${res.count} categorie vuote (+ translations in cascade)`);
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
