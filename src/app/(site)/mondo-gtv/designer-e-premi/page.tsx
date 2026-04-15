import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRelatedCardImages } from "@/lib/page-images";
import { tBatch } from "@/lib/i18n";
import type { Metadata } from "next";
import DesignerGrid from "./DesignerGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Designer e Premi | Gebrüder Thonet Vienna",
  description:
    "GTV collabora con designer di talento per reinterpretare la tradizione. Scopri i designer e i premi internazionali di GTV.",
};

const RELATED_PAGES = [
  {
    page: "brand-manifesto",
    label: "Brand Manifesto",
    href: "/mondo-gtv/brand-manifesto",
  },
  {
    page: "curvatura-legno",
    label: "La Curvatura del Legno",
    href: "/mondo-gtv/curvatura-legno",
  },
  {
    page: "sostenibilita",
    label: "Sostenibilit\u00e0",
    href: "/mondo-gtv/sostenibilita",
  },
];

export default async function DesignerPremiPage() {
  // Fetch all active designers
  const designers = await prisma.designer.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, slug: true, imageUrl: true },
  });

  // Fetch awards from DB with associated products
  const allAwards = await prisma.award.findMany({
    where: { isActive: true },
    orderBy: [{ year: "asc" }, { createdAt: "asc" }],
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              subcategory: true,
              coverImage: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  // Related page covers
  const cardImages = await getRelatedCardImages(RELATED_PAGES.map((p) => p.page));
  const T = await tBatch([
    "designer-premi.title",
    "designer-premi.intro",
    "designer-premi.designers.title",
    "designer-premi.awards.title",
    "designer-premi.breadcrumb",
    "common.related",
    "common.breadcrumb_home",
    "nav.world",
  ]);

  return (
    <>
      {/* ── Titolo + Intro ─────────────────────────────────────── */}
      <section className="pt-20 md:pt-28 pb-16 md:pb-20">
        <div className="gtv-container">
          <h1 className="font-serif text-[58px] text-black tracking-normal text-center mb-[200px]">
            {T["designer-premi.title"]}
          </h1>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            {T["designer-premi.intro"]}
          </p>
        </div>
      </section>

      {/* ── DESIGNER grid ────────────────────────────────────────── */}
      <section className="w-full py-20 md:py-28">
        <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-10">
          {T["designer-premi.designers.title"]}
        </h2>
        <DesignerGrid designers={designers} />
      </section>

      {/* ── Separator ────────────────────────────────────────────── */}
      <div className="mx-auto w-[95%] max-w-[90%]">
        <div className="separator" />
      </div>

      {/* ── PREMI ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-[95%] max-w-[90%]">
          <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-12">
            {T["designer-premi.awards.title"]}
          </h2>

          <div className="space-y-24">
            {allAwards.map((award) => {
              const products = award.products.map((ap) => ap.product).filter(Boolean);
              return (
                <div key={award.id} className="flex items-start gap-0">
                  {/* Left: award image — square, small */}
                  <div className="flex-shrink-0 w-[120px] md:w-[160px] pt-2">
                    {award.imageUrl ? (
                      <div className="relative aspect-square">
                        <Image
                          src={award.imageUrl}
                          alt={`${award.organization ?? ""} ${award.year}`.trim()}
                          fill
                          className="object-contain"
                          sizes="160px"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-warm-100 flex items-center justify-center">
                        <span className="text-xs text-warm-400 text-center px-2">
                          {award.organization || award.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vertical line with > chevron near the top (award level) */}
                  <div className="relative flex-shrink-0 w-[32px] self-stretch ml-3">
                    <div className="absolute left-[10px] top-0 w-px bg-dark" style={{ height: 44 }} />
                    <svg
                      className="absolute left-[9px]"
                      style={{ top: 42 }}
                      width="16"
                      height="24"
                      viewBox="0 0 16 24"
                      fill="none"
                    >
                      <path d="M1 1L15 12L1 23" stroke="#1a1a1a" strokeWidth="1" />
                    </svg>
                    <div className="absolute left-[10px] bottom-0 w-px bg-dark" style={{ top: 64 }} />
                  </div>

                  {/* Right: products — stesso stile card pagina /prodotti */}
                  <div className="flex-1 pl-6 md:pl-10">
                    {products.length === 0 ? (
                      <div className="py-4">
                        <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                          {award.name}
                        </h3>
                        {award.organization && (
                          <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light mt-1">
                            {award.organization} {award.year}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20">
                        {products.map((prod) => {
                          const imgSrc = prod.coverImage || prod.imageUrl || null;
                          return (
                            <Link
                              key={prod.id}
                              href={`/prodotti/${prod.slug}`}
                              className="group block"
                            >
                              <div className="relative bg-[#f6f6f6] overflow-hidden" style={{ aspectRatio: "4/5" }}>
                                {imgSrc ? (
                                  <Image
                                    src={imgSrc}
                                    alt={prod.name}
                                    fill
                                    className="object-cover mix-blend-multiply"
                                    sizes="(max-width: 768px) 80vw, 40vw"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="font-serif text-4xl text-warm-300">
                                      {prod.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4">
                                {(prod.subcategory || prod.category) && (
                                  <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">
                                    {prod.subcategory || prod.category}
                                  </p>
                                )}
                                <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                                  {prod.name}
                                </h3>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Potrebbe Interessarti Anche — stessa larghezza heritage ─── */}
      <section className="py-20 md:py-28">
        <div className="gtv-container">
          <div className="mx-auto" style={{ maxWidth: "73.5%" }}>
            <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-12">
              {T["common.related"]}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {RELATED_PAGES.map((rp) => {
                const coverSrc = cardImages[rp.page] || null;
                return (
                  <Link key={rp.page} href={rp.href} className="group block">
                    <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
                      {coverSrc ? (
                        <Image
                          src={coverSrc}
                          alt={rp.label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-warm-200" />
                      )}
                    </div>
                    <h4 className="font-sans text-[22px] md:text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mt-4">
                      {rp.label}
                    </h4>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Breadcrumbs ───────────────────────────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">{T["common.breadcrumb_home"]}</Link>
          <span>&gt;</span>
          <Link href="/mondo-gtv">{T["nav.world"]}</Link>
          <span>&gt;</span>
          <span>{T["designer-premi.breadcrumb"]}</span>
        </div>
      </div>
    </>
  );
}
