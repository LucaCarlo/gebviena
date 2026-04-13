import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRelatedCardImages } from "@/lib/page-images";
import type { Metadata } from "next";
import DesignerGrid from "./DesignerGrid";

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
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, imageUrl: true },
  });

  // Fetch awards from DB
  const allAwards = await prisma.award.findMany({
    where: { isActive: true },
    orderBy: { year: "asc" },
  });

  // Group awards by organization + year
  const awardGroups = new Map<string, typeof allAwards>();
  for (const award of allAwards) {
    const key = `${award.organization}-${award.year}`;
    if (!awardGroups.has(key)) {
      awardGroups.set(key, []);
    }
    awardGroups.get(key)!.push(award);
  }

  // Fetch product images for awards that have productSlug
  const awardSlugs = allAwards
    .map((a) => a.productSlug)
    .filter((s): s is string => !!s);
  const awardProducts = await prisma.product.findMany({
    where: { slug: { in: awardSlugs } },
    select: { slug: true, coverImage: true, imageUrl: true },
  });
  const productBySlug = new Map(awardProducts.map((p) => [p.slug, p]));

  // Related page covers
  const cardImages = await getRelatedCardImages(RELATED_PAGES.map((p) => p.page));

  return (
    <>
      {/* ── Titolo + Intro ─────────────────────────────────────── */}
      <section className="pt-20 md:pt-28 pb-16 md:pb-20">
        <div className="gtv-container">
          <h1 className="font-serif text-[58px] text-black tracking-normal text-center mb-[200px]">
            Designer e premi
          </h1>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            GTV collabora con designer di talento per reinterpretare la
            tradizione attraverso un linguaggio contemporaneo. Questo impegno
            nella ricerca e nell&apos;innovazione &egrave; riconosciuto a
            livello internazionale, con premi e menzioni che attestano
            l&apos;eccellenza del brand nel design.
          </p>
        </div>
      </section>

      {/* ── DESIGNER grid ────────────────────────────────────────── */}
      <section className="w-full py-20 md:py-28">
        <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-10">
          Designer
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
            Premi
          </h2>

          <div className="space-y-24">
            {Array.from(awardGroups.entries()).map(([key, awards]) => {
              const first = awards[0];
              return (
                <div key={key} className="flex items-start gap-0">
                  {/* Left: award image — square, small */}
                  <div className="flex-shrink-0 w-[120px] md:w-[160px] pt-2">
                    {first.imageUrl ? (
                      <div className="relative aspect-square">
                        <Image
                          src={first.imageUrl}
                          alt={`${first.organization} ${first.year}`}
                          fill
                          className="object-contain"
                          sizes="160px"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-warm-100 flex items-center justify-center">
                        <span className="text-xs text-warm-400 text-center px-2">
                          {first.organization}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vertical line with > chevron near the top (award level) */}
                  <div className="relative flex-shrink-0 w-[32px] self-stretch ml-3">
                    {/* Top segment of line — overlaps 1px into chevron */}
                    <div className="absolute left-[10px] top-0 w-px bg-dark" style={{ height: 44 }} />
                    {/* Chevron > — left edge of V aligns with the line */}
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
                    {/* Bottom segment of line — overlaps 1px into chevron */}
                    <div className="absolute left-[10px] bottom-0 w-px bg-dark" style={{ top: 64 }} />
                  </div>

                  {/* Right: products — stesso stile card pagina /prodotti */}
                  <div className="flex-1 pl-6 md:pl-10">
                    <div className={`grid gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20 ${awards.length === 1 ? "grid-cols-1 max-w-md" : "grid-cols-1 md:grid-cols-2"}`}>
                      {awards.map((award) => {
                        const prod = award.productSlug
                          ? productBySlug.get(award.productSlug)
                          : null;
                        const imgSrc =
                          prod?.coverImage || prod?.imageUrl || null;
                        return (
                          <Link
                            key={award.id}
                            href={
                              award.productSlug
                                ? `/prodotti/${award.productSlug}`
                                : "#"
                            }
                            className="group block"
                          >
                            <div className="relative bg-[#f6f6f6] overflow-hidden" style={{ aspectRatio: "4/5" }}>
                              {imgSrc ? (
                                <Image
                                  src={imgSrc}
                                  alt={award.productName || award.name}
                                  fill
                                  className="object-cover mix-blend-multiply"
                                  sizes="(max-width: 768px) 80vw, 40vw"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="font-serif text-4xl text-warm-300">
                                    {(award.productName || award.name).charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="mt-4">
                              {award.productCategory && (
                                <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">
                                  {award.productCategory}
                                </p>
                              )}
                              <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                                {award.productName || award.name}
                              </h3>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
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
              Potrebbe interessarti anche
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
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <Link href="/mondo-gtv">Mondo GTV</Link>
          <span>&gt;</span>
          <span>Designer e premi</span>
        </div>
      </div>
    </>
  );
}
