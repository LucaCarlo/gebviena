/**
 * Seed: per ogni Product attivo del catalogo, crea/aggiorna lo StoreProduct
 * (in bozza isPublished=false) e una StoreProductTranslation IT con:
 *   - shortDescription: primo paragrafo della Product.description, max 220 char
 *   - marketingDescription: HTML del Product.description (preservato as-is)
 *
 * NON sovrascrive lo StoreProduct/Translation se il Product ha già una
 * shortDescription valorizzata (preserva i nostri seed manuali, es. Cafestuhl).
 *
 * Designer: NON viene toccato — il collegamento Product.designerId esiste già
 * nel catalogo e la pagina prodotto store legge bio/imageUrl da Designer.
 */
import { prisma } from "../src/lib/prisma";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shorten(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.substring(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxLen - 40) return cut.substring(0, lastSpace) + "…";
  return cut + "…";
}

function defaultShort(name: string, designerName: string | null, category: string | null, subcategory: string | null): string {
  const what = subcategory || category || "complemento d'arredo";
  const by = designerName ? ` firmato ${designerName}` : "";
  return `${name} è ${/^[aeiouAEIOU]/.test(what) ? "un'" : "un "}${what.toLowerCase()}${by}, parte della collezione Gebrüder Thonet Vienna. Curvatura del legno e tradizione viennese in chiave contemporanea.`;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, slug: true, description: true,
      designerName: true, category: true, subcategory: true,
    },
  });

  console.log(`Found ${products.length} active products in catalog`);

  let createdSP = 0, updatedSP = 0, createdTr = 0, updatedTr = 0, skipped = 0;

  for (const p of products) {
    // 1. Find or create StoreProduct (draft)
    let sp = await prisma.storeProduct.findUnique({ where: { productId: p.id } });
    if (!sp) {
      sp = await prisma.storeProduct.create({
        data: {
          productId: p.id,
          isPublished: false, // bozza
        },
      });
      createdSP++;
    } else {
      updatedSP++;
    }

    // 2. Check existing IT translation
    const existingTr = await prisma.storeProductTranslation.findUnique({
      where: { storeProductId_languageCode: { storeProductId: sp.id, languageCode: "it" } },
    });

    // Skip if a meaningful shortDescription is already there
    if (existingTr?.shortDescription && existingTr.shortDescription.length > 30) {
      skipped++;
      continue;
    }

    // 3. Generate shortDescription + marketingDescription
    const plain = p.description ? stripHtml(p.description) : "";
    const firstPara = plain.split(/\n\n+/)[0]?.trim() || "";
    const shortDescription = firstPara.length > 30
      ? shorten(firstPara, 220)
      : defaultShort(p.name, p.designerName, p.category, p.subcategory);
    const marketingDescription = p.description && p.description.trim().length > 0
      ? p.description // HTML del catalogo
      : `<p>${defaultShort(p.name, p.designerName, p.category, p.subcategory)}</p>`;

    if (existingTr) {
      await prisma.storeProductTranslation.update({
        where: { id: existingTr.id },
        data: {
          shortDescription,
          marketingDescription,
        },
      });
      updatedTr++;
    } else {
      await prisma.storeProductTranslation.create({
        data: {
          storeProductId: sp.id,
          languageCode: "it",
          name: p.name,
          slug: p.slug,
          shortDescription,
          marketingDescription,
          status: "draft",
          isPublished: false,
        },
      });
      createdTr++;
    }
  }

  console.log("");
  console.log(`✅ DONE`);
  console.log(`   StoreProduct created (draft):  ${createdSP}`);
  console.log(`   StoreProduct already existed:  ${updatedSP}`);
  console.log(`   IT Translation created:        ${createdTr}`);
  console.log(`   IT Translation updated:        ${updatedTr}`);
  console.log(`   Products skipped (already had shortDescription): ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
