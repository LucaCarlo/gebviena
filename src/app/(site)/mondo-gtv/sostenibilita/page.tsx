import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
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
  const [heroSlide, imgs, cardImages] = await Promise.all([
    prisma.heroSlide.findFirst({
      where: { page: "sostenibilita", isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPageImages("sostenibilita", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
  ]);

  const heroImage = heroSlide?.imageUrl || "/images/sostenibilita-hero.webp";
  const heroTitle = heroSlide?.title || "Sostenibilità";
  const heroSubtitle = heroSlide?.subtitle || null;
  const heroImagePosition = heroSlide?.imagePosition || "center center";

  return (
    <>
      {/* ── Hero — identica a curvatura-legno ─────────────────────────── */}
      <section className="relative w-full overflow-hidden bg-warm-900" style={{ height: "min(118vh, 1107px)" }}>
        <Image
          src={heroImage}
          alt={heroTitle}
          fill
          className="object-cover opacity-20"
          style={{ objectPosition: heroImagePosition }}
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8" style={{ paddingTop: "25px" }}>
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

      {/* ── Titolo + Introduzione — stile mondo-gtv standard ────── */}
      <section className="py-20">
        <div className="gtv-container">
          <h2 className="font-serif text-[32px] md:text-[44px] text-black leading-[1.15] mb-24 text-center">
            La tutela ambientale: una sfida per
            <br />
            il futuro, un&apos;opportunit&agrave; per GTV.
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mb-6">
            Anno dopo anno, GTV ha sviluppato una crescente sensibilit&agrave;
            verso le tematiche ambientali e, nell&apos;ottica di un
            miglioramento continuo, aderisce alle normative che privilegiano
            l&apos;uso di processi e materiali sostenibili. Un segno tangibile,
            un punto fermo che traccia un percorso orientato alla
            continuit&agrave;, anche etica, tra il ciclo produttivo e il
            prodotto.
          </p>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            Un impegno concreto da parte dell&apos;azienda per offrire garanzie
            reali in termini di sostenibilit&agrave; ambientale e tutela della
            salute dei consumatori, con l&apos;obiettivo di costruire un
            rapporto di fiducia basato su un approccio integrato allo sviluppo
            sostenibile.
          </p>
        </div>
      </section>

      {/* ── Legno Certificato FSC® — stesso stile di "Il Brevetto" curvatura-legno (image sx, testo dx) ─── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
            {/* Left: image — flush left, square */}
            <div className="relative aspect-square bg-warm-100 overflow-hidden mr-auto" style={{ maxWidth: "76%", width: "100%" }}>
              <Image
                src={imgs["legno-fsc"]}
                alt="Legno Certificato FSC®"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>

            {/* Right: text */}
            <div className="flex flex-col" style={{ paddingTop: "10px", paddingLeft: "60px", paddingRight: "0" }}>
              <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                Legno Certificato FSC&reg; (C123220)
              </h2>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8 mb-6">
                Per la realizzazione delle proprie collezioni, Gebrüder Thonet
                Vienna GmbH sceglie di utilizzare legno certificato FSC&reg;
                (Forest Stewardship Council&reg;), il principale sistema
                internazionale di certificazione che garantisce la provenienza
                del legno da foreste gestite secondo rigorosi standard
                ambientali, sociali ed economici.
              </p>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-6">
                Oltre a questa scelta, GTV adotta lavorazioni meno visibili ma
                altrettanto fondamentali per la sostenibilit&agrave;.
                L&apos;azienda ha infatti avviato la conversione del processo di
                verniciatura, sostituendo le vernici poliuretaniche con vernici a
                base d&apos;acqua, riducendo cos&igrave; le emissioni in
                atmosfera e garantendo una maggiore tutela per il personale
                coinvolto.
              </p>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                Nel 2021, GTV ha inaugurato un nuovo progetto Green, introducendo
                prodotti interamente sostenibili, tra cui la nuova sedia
                Beaulieu, progettata con un&apos;attenzione particolare alla
                sostenibilit&agrave;.
              </p>
            </div>
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
          <span>Sostenibilit&agrave;</span>
        </div>
      </div>
    </>
  );
}
