import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getAuthProfessional } from "@/lib/professional-auth";
import { isSectionAllowedForRole, getSection } from "../_lib/sections";
import { getProT } from "@/lib/pro-translations";
import { prisma } from "@/lib/prisma";
import DigitalMediaClient from "./DigitalMediaClient";

export const dynamic = "force-dynamic";
const SLUG = "digital-media";

export default async function Page() {
  const pro = await getAuthProfessional();
  if (!pro) redirect("/area-professionisti/accesso");
  if (!isSectionAllowedForRole(SLUG, pro.role)) redirect("/area-professionisti");
  const h = await headers();
  const lang = h.get("x-gtv-lang") || "it";
  const t = getProT(lang);
  const section = getSection(SLUG, lang)!;

  // Carica tipologie + foto pro + tutti i prodotti attivi (per estrarre le
  // immagini del catalogo: cover, gallery, hero, side — visibili anche ai
  // professionisti, in modo che da li possano scaricare TUTTE le immagini
  // del prodotto, non solo quelle pro).
  const [typologies, productImagesRaw, typologyImages, allProducts] = await Promise.all([
    prisma.contentTypology.findMany({
      where: { contentType: "products", isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { translations: true },
    }),
    prisma.professionalImage.findMany({
      where: { isActive: true, productId: { not: null } },
      include: {
        product: { select: { id: true, name: true, slug: true, category: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.professionalImage.findMany({
      where: { isActive: true, typology: { not: null }, productId: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.product.findMany({
      where: { isActive: true, excludeFromCatalog: false },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        imageUrl: true,
        coverImage: true,
        galleryImages: true,
        heroImage: true,
        sideImage: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const typologiesData = typologies.map((tp) => {
    const tr = tp.translations.find((x) => x.languageCode === lang);
    return { value: tp.value, label: tr?.label || tp.label };
  });

  // Estrae da ogni Product gli URL delle immagini del catalogo + le concatena
  // alle foto pro. Dedupe by URL per evitare doppioni se la stessa immagine e
  // sia in coverImage che in galleryImages.
  const catalogItems: typeof productImagesRaw = [];
  for (const p of allProducts) {
    const urls = new Set<string>();
    if (p.coverImage) urls.add(p.coverImage);
    if (p.imageUrl) urls.add(p.imageUrl);
    if (p.heroImage) urls.add(p.heroImage);
    if (p.sideImage) urls.add(p.sideImage);
    if (p.galleryImages) {
      try {
        const arr = JSON.parse(p.galleryImages);
        if (Array.isArray(arr)) for (const u of arr) if (typeof u === "string" && u) urls.add(u);
      } catch { /* silent */ }
    }
    let idx = 0;
    for (const u of urls) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catalogItems.push({
        id: `cat-${p.id}-${idx}`,
        productId: p.id,
        typology: null,
        fileUrl: u,
        fileName: u.split("/").pop() || "image",
        storage: "local",
        size: null,
        width: null,
        height: null,
        sortOrder: idx,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: { id: p.id, name: p.name, slug: p.slug, category: p.category },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      idx++;
    }
  }

  // Dedupe pro vs catalog (se per qualche motivo lo stesso URL e in entrambi)
  const seenUrls = new Set(productImagesRaw.map((i) => i.fileUrl));
  const productImages = [
    ...productImagesRaw,
    ...catalogItems.filter((c) => !seenUrls.has(c.fileUrl)),
  ];

  return (
    <main className="min-h-screen bg-warm-50 pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <Link href="/area-professionisti" className="inline-block text-[11px] tracking-[0.18em] uppercase text-warm-700 hover:text-warm-900 mb-6">
          {t("common.back_to_dashboard")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-serif text-warm-900 mb-3 tracking-tight">{section.label}</h1>
        <p className="text-base text-warm-700 leading-relaxed mb-10 max-w-3xl">{section.description}</p>

        <DigitalMediaClient
          typologies={typologiesData}
          productImages={productImages.map((i) => ({
            id: i.id,
            fileUrl: i.fileUrl,
            fileName: i.fileName,
            productId: i.productId,
            productName: i.product?.name || "",
            productSlug: i.product?.slug || "",
            productCategory: i.product?.category || "",
          }))}
          typologyImages={typologyImages.map((i) => ({
            id: i.id,
            fileUrl: i.fileUrl,
            fileName: i.fileName,
            typology: i.typology || "",
          }))}
        />
      </div>
    </main>
  );
}
