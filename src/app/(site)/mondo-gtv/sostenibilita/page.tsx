import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPageImages } from "@/lib/page-images";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sostenibilità | Gebrüder Thonet Vienna",
  description:
    "La tutela ambientale: una sfida per il futuro, un'opportunità per GTV. Scopri l'impegno di Gebrüder Thonet Vienna per la sostenibilità.",
};

const RELATED_PAGES = [
  {
    page: "brand-manifesto",
    label: "Brand Manifesto",
    href: "/mondo-gtv/brand-manifesto",
  },
  { page: "heritage", label: "Heritage", href: "/mondo-gtv/heritage" },
  {
    page: "curvatura-legno",
    label: "La Curvatura del Legno",
    href: "/mondo-gtv/curvatura-legno",
  },
];

const DEFAULTS: Record<string, string> = {
  "legno-fsc": "/images/sostenibilita-legno.jpg",
};

export default async function SostenibilitaPage() {
  const [heroSlide, imgs, relatedSlides] = await Promise.all([
    prisma.heroSlide.findFirst({
      where: { page: "sostenibilita", isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPageImages("sostenibilita", DEFAULTS),
    prisma.heroSlide.findMany({
      where: {
        page: { in: RELATED_PAGES.map((p) => p.page) },
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const slidesByPage = new Map<string, (typeof relatedSlides)[0]>();
  for (const slide of relatedSlides) {
    if (!slidesByPage.has(slide.page)) {
      slidesByPage.set(slide.page, slide);
    }
  }

  const heroImage = heroSlide?.imageUrl || "/images/sostenibilita-hero.webp";
  const heroTitle = heroSlide?.title || "Sostenibilità";
  const heroSubtitle = heroSlide?.subtitle || null;

  return (
    <>
      {/* ── Hero — solo titolo, più alta ─────────────────────────── */}
      <section className="relative w-full flex items-center justify-center bg-warm-900" style={{ minHeight: "110vh" }}>
        <Image
          src={heroImage}
          alt={heroTitle}
          fill
          className="object-cover opacity-30"
          sizes="100vw"
          priority
        />
        <div className="relative text-center px-8">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-[4rem] text-white leading-[1.2] tracking-tight">
            {heroTitle}
          </h1>
          {heroSubtitle && (
            <p className="text-lg md:text-xl text-white/80 font-light mt-4 max-w-2xl mx-auto">
              {heroSubtitle}
            </p>
          )}
        </div>
      </section>

      {/* ── Titolo + Introduzione — stile GTV Oggi ────────────── */}
      <section className="pt-20 md:pt-28 pb-20 md:pb-28">
        <div className="gtv-container-narrow">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-dark leading-[1.15] mb-8 text-center">
            La tutela ambientale: una sfida per
            <br />
            il futuro, un&apos;opportunit&agrave; per GTV.
          </h2>
          <p className="text-lg text-dark leading-[1.8] font-light mb-6 text-left">
            Anno dopo anno, GTV ha sviluppato una crescente sensibilit&agrave;
            verso le tematiche ambientali e, nell&apos;ottica di un
            miglioramento continuo, aderisce alle normative che privilegiano
            l&apos;uso di processi e materiali sostenibili. Un segno tangibile,
            un punto fermo che traccia un percorso orientato alla
            continuit&agrave;, anche etica, tra il ciclo produttivo e il
            prodotto.
          </p>
          <p className="text-lg text-dark leading-[1.8] font-light text-left">
            Un impegno concreto da parte dell&apos;azienda per offrire garanzie
            reali in termini di sostenibilit&agrave; ambientale e tutela della
            salute dei consumatori, con l&apos;obiettivo di costruire un
            rapporto di fiducia basato su un approccio integrato allo sviluppo
            sostenibile.
          </p>
        </div>
      </section>

      {/* ── Legno Certificato FSC® — stile Il Brevetto ─────────── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto w-[95%] max-w-[90%]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-28 items-start">
            {/* Left: image — 40% */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square bg-warm-100 overflow-hidden">
                <Image
                  src={imgs["legno-fsc"]}
                  alt="Legno Certificato FSC®"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </div>

            {/* Right: text — 60% */}
            <div className="lg:col-span-7 lg:pr-12 xl:pr-20">
              <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl text-dark mb-8 uppercase tracking-wide font-light">
                Legno Certificato FSC&reg; (C123220)
              </h2>
              <p className="text-lg text-dark leading-[1.8] font-light mb-6">
                Per la realizzazione delle proprie collezioni, Gebrüder Thonet
                Vienna GmbH sceglie di utilizzare legno certificato FSC&reg;
                (Forest Stewardship Council&reg;), il principale sistema
                internazionale di certificazione che garantisce la provenienza
                del legno da foreste gestite secondo rigorosi standard
                ambientali, sociali ed economici.
              </p>
              <p className="text-lg text-dark leading-[1.8] font-light mb-6">
                Oltre a questa scelta, GTV adotta lavorazioni meno visibili ma
                altrettanto fondamentali per la sostenibilit&agrave;.
                L&apos;azienda ha infatti avviato la conversione del processo di
                verniciatura, sostituendo le vernici poliuretaniche con vernici a
                base d&apos;acqua, riducendo cos&igrave; le emissioni in
                atmosfera e garantendo una maggiore tutela per il personale
                coinvolto.
              </p>
              <p className="text-lg text-dark leading-[1.8] font-light">
                Nel 2021, GTV ha inaugurato un nuovo progetto Green, introducendo
                prodotti interamente sostenibili, tra cui la nuova sedia
                Beaulieu, progettata con un&apos;attenzione particolare alla
                sostenibilit&agrave;.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Potrebbe Interessarti Anche ───────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-[90%] max-w-[75%]">
          <h3 className="text-center font-sans text-base md:text-lg uppercase tracking-[0.15em] text-dark mb-12">
            Potrebbe interessarti anche
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RELATED_PAGES.map((rp) => {
              const slide = slidesByPage.get(rp.page);
              const coverSrc =
                slide?.coverImage || slide?.imageUrl || null;
              return (
                <Link key={rp.page} href={rp.href} className="group block">
                  <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
                    {coverSrc ? (
                      <Image
                        src={coverSrc}
                        alt={rp.label}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-warm-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-end p-6">
                      <h4 className="font-sans text-sm md:text-base uppercase tracking-[0.15em] text-white font-light">
                        {rp.label}
                      </h4>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Breadcrumbs ───────────────────────────────────────────── */}
      <div className="gtv-container pb-12">
        <nav className="flex items-center gap-2 text-xs text-warm-400">
          <Link href="/" className="hover:text-warm-800 transition-colors">
            Home
          </Link>
          <span>&gt;</span>
          <Link
            href="/mondo-gtv"
            className="hover:text-warm-800 transition-colors"
          >
            Mondo GTV
          </Link>
          <span>&gt;</span>
          <span className="text-warm-600">Sostenibilit&agrave;</span>
        </nav>
      </div>
    </>
  );
}
