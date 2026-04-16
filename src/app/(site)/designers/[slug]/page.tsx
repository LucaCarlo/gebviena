import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { getCurrentLang, DEFAULT_LANG, tBatch } from "@/lib/i18n";
import { mergeFirstTranslation, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";
import { buildAlternates } from "@/lib/seo-alternates";
import { getCategoryLabelMap } from "@/lib/server-categories";
import { lookupLabel } from "@/lib/category-lookup";
import { localizePath } from "@/lib/path-segments";

interface PageProps {
  params: { slug: string };
}

async function resolveDesignerId(slug: string, lang: string): Promise<string | null> {
  if (lang !== DEFAULT_LANG) {
    const tr = await prisma.designerTranslation.findFirst({
      where: { languageCode: lang, slug },
      select: { designerId: true },
    });
    if (tr) return tr.designerId;
  }
  const d = await prisma.designer.findUnique({ where: { slug }, select: { id: true } });
  return d?.id ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = getCurrentLang();
  const designerId = await resolveDesignerId(params.slug, lang);
  if (!designerId) return { title: "Designer non trovato" };

  const includeTranslations = lang !== DEFAULT_LANG;
  const raw = await prisma.designer.findUnique({
    where: { id: designerId },
    select: {
      name: true,
      seoTitle: true,
      seoDescription: true,
      ...(includeTranslations
        ? {
            translations: {
              where: { languageCode: lang },
              select: { name: true, seoTitle: true, seoDescription: true },
            },
          }
        : {}),
    },
  });

  if (!raw) return { title: "Designer non trovato" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = includeTranslations
    ? mergeFirstTranslation(raw as Record<string, unknown>, ["name", "seoTitle", "seoDescription"])
    : raw;

  const allTr = await prisma.designerTranslation.findMany({
    where: { designerId },
    select: { languageCode: true, slug: true },
  });
  const slugByLang: Record<string, string> = { it: params.slug };
  for (const t of allTr) if (t.slug) slugByLang[t.languageCode] = t.slug;
  const alternates = await buildAlternates(`/designers/${params.slug}`, slugByLang);

  return {
    title: d.seoTitle || `${d.name} | Gebrüder Thonet Vienna`,
    description: d.seoDescription || `Scopri i prodotti disegnati da ${d.name} per GTV.`,
    alternates,
  };
}

export default async function DesignerDetailPage({ params }: PageProps) {
  const lang = getCurrentLang();
  const includeTranslations = lang !== DEFAULT_LANG;
  const designerId = await resolveDesignerId(params.slug, lang);
  if (!designerId) notFound();

  const [rawDesigner, T, productLabelMap] = await Promise.all([
    prisma.designer.findUnique({
      where: { id: designerId! },
      ...(includeTranslations
        ? { include: { translations: { where: { languageCode: lang } } } }
        : {}),
    }),
    tBatch([
      "designers.detail.products",
      "designers.detail.visit_website",
      "common.breadcrumb_home",
      "nav.world",
      "designer-premi.breadcrumb",
    ]),
    getCategoryLabelMap("products"),
  ]);

  if (!rawDesigner || !rawDesigner.isActive) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const designer: any = includeTranslations
    ? mergeFirstTranslation(rawDesigner as unknown as Record<string, unknown>, TRANSLATABLE_FIELDS.designer)
    : rawDesigner;

  const rawProducts = await prisma.product.findMany({
    where: { designerId: designer.id, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      subcategory: true,
      coverImage: true,
      imageUrl: true,
      ...(includeTranslations
        ? {
            translations: {
              where: { languageCode: lang },
              select: { name: true, slug: true },
            },
          }
        : {}),
    },
  });

  const products = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawProducts as any[]).map((p) => mergeFirstTranslation(p, ["name", "slug"]))
    : rawProducts;

  return (
    <>
      {/* ── Title — heritage-style ────────────────────────────────── */}
      <section className="gtv-container pt-16 pb-16">
        <h1 className="font-serif text-[34px] md:text-[44px] text-black tracking-tight text-center font-light">
          {designer.name}
        </h1>
      </section>

      {/* ── Bio: foto + testo — heritage "Foto famiglia" style ────── */}
      {(designer.imageUrl || designer.bio) && (
        <section className="pb-20">
          <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
              <div style={{ marginRight: "10px" }}>
                {designer.imageUrl ? (
                  /* Use plain <img> so the image keeps its native aspect ratio
                     instead of being cropped/letterboxed into a fixed 16/10 box. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={designer.imageUrl}
                    alt={designer.name}
                    className="block w-full h-auto bg-warm-100"
                    loading="eager"
                  />
                ) : (
                  <div className="bg-warm-100 aspect-square flex items-center justify-center">
                    <span className="font-serif text-8xl text-warm-300">
                      {designer.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-start" style={{ paddingTop: "10px", paddingLeft: "151px", paddingRight: "0" }}>
                {designer.bio && (
                  <div
                    className="text-[20px] text-black leading-snug font-light tracking-normal [&_p]:mb-4 [&_p:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: designer.bio }}
                  />
                )}
                {designer.website && (
                  <a
                    href={designer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-8 uppercase text-[16px] tracking-[0.03em] text-black font-medium hover:underline"
                    style={{ textUnderlineOffset: "6px", textDecorationThickness: "0.5px" }}
                  >
                    {T["designers.detail.visit_website"]}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Prodotti — same card style as /prodotti listing ────────── */}
      {products.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="text-center mb-12">
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              {T["designers.detail.products"]}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20 px-2 md:px-3 lg:px-4">
            {products.map((product) => {
              const imgSrc = product!.coverImage || product!.imageUrl;
              const cardLabel = lookupLabel(productLabelMap, product!.subcategory || (product!.category || "").split(",")[0]);
              return (
                <Link
                  key={product!.id}
                  href={localizePath(`/prodotti/${product!.slug}`, lang)}
                  className="group block"
                >
                  <div className="relative bg-[#f6f6f6] overflow-hidden" style={{ aspectRatio: "4/5", isolation: "isolate" }}>
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={product!.name}
                        fill
                        className="object-contain mix-blend-multiply p-4"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-serif text-4xl text-warm-300">
                          {product!.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    {cardLabel && (
                      <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">
                        {cardLabel}
                      </p>
                    )}
                    <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                      {product!.name}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Breadcrumbs — heritage style ──────────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">{T["common.breadcrumb_home"]}</Link>
          <span>&gt;</span>
          <Link href="/mondo-gtv">{T["nav.world"]}</Link>
          <span>&gt;</span>
          <Link href="/mondo-gtv/designer-e-premi">{T["designer-premi.breadcrumb"]}</Link>
          <span>&gt;</span>
          <span>{designer.name}</span>
        </div>
      </div>
    </>
  );
}
