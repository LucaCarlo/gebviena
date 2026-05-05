/**
 * One-shot: restore Caféstuhl Product (catalogo sito normale) ai valori del backup
 * del 4 maggio 2026, prima che seed-cafestuhl.ts li sovrascrivesse.
 * Lo StoreProduct non viene toccato — mantiene le 2 immagini caricate per lo shop.
 */
import fs from "fs";
import { prisma } from "../src/lib/prisma";

interface OrigData {
  id: string;
  description: string | null;
  materials: string | null;
  dimensions: string | null;
  imageUrl: string;
  coverImage: string | null;
  galleryImages: string | null;
  heroImage: string | null;
  sideImage: string | null;
  dimensionBlockId: string | null;
  dimensionValues: string | null;
  galleryOrientations: string | null;
  dimensionImage: string | null;
  techSheetUrl: string | null;
  model3dUrl: string | null;
  year: string | null;
}

async function main() {
  const orig: OrigData = JSON.parse(fs.readFileSync("/tmp/cafestuhl-orig.json", "utf8"));

  await prisma.product.update({
    where: { id: orig.id },
    data: {
      description: orig.description || null,
      materials: orig.materials || null,
      dimensions: orig.dimensions || null,
      imageUrl: orig.imageUrl,
      coverImage: orig.coverImage,
      galleryImages: orig.galleryImages,
      galleryOrientations: orig.galleryOrientations,
      heroImage: orig.heroImage,
      sideImage: orig.sideImage,
      dimensionBlockId: orig.dimensionBlockId,
      dimensionValues: orig.dimensionValues,
      dimensionImage: orig.dimensionImage,
      techSheetUrl: orig.techSheetUrl,
      model3dUrl: orig.model3dUrl,
      year: orig.year ? parseInt(orig.year) : null,
    },
  });
  console.log("✓ Restored Caféstuhl Product (catalog) from backup");

  const p = await prisma.product.findUnique({
    where: { id: orig.id },
    select: { coverImage: true, galleryImages: true },
  });
  console.log("  coverImage:", p?.coverImage);
  console.log("  galleryImages:", p?.galleryImages?.substring(0, 200) + "...");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
