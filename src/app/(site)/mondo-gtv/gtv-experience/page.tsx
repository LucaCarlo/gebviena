import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
import ExperienceCarousel from "./ExperienceCarousel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTV Experience — Interno Marche Design Hotel | Gebrüder Thonet Vienna",
  description:
    "GTV arreda gli spazi prestigiosi di Interno Marche Design Hotel. Scopri la rinascita di Villa Gabrielli con le iconiche collezioni Gebrüder Thonet Vienna.",
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

const DEFAULTS: Record<string, string> = {
  stories: "/images/experience-stories.webp",
  lobby: "/images/experience-lobby.webp",
  "landscape-1": "/images/foto-landscape-double-1.webp",
  "landscape-2": "/images/foto-landscape-double-2.webp",
  corridors: "/images/experience-corridors.webp",
  "camera-1": "/images/INTERNO_MARCHE_023_17-683x1024.jpg",
  "camera-2": "/images/InternoMarche-34-751x1024.jpg",
  "camera-3": "/images/INTERNO_MARCHE_023_16-742x1024.jpg",
  "carousel-1": "/images/Magistretti-G03_1-2048x1365.jpg",
  "carousel-2": "/images/Secessione-Viennese-G07_1-2048x1861.jpg",
  "carousel-3": "/images/ArtsCrafts-G05_3-2048x1666.jpg",
  "carousel-4": "/images/Thonet-303_1-2048x1365.jpg",
  "carousel-5": "/images/Thonet-303_6-2048x1486.jpg",
  gamfratesi: "/images/GamFratesi.jpg",
};

export default async function GtvExperiencePage() {
  const [heroSlide, imgs, cardImages] = await Promise.all([
    prisma.heroSlide.findFirst({
      where: { page: "gtv-experience", isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPageImages("gtv-experience", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
  ]);

  const heroImage = heroSlide?.imageUrl || "/images/experience-hero.webp";

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative w-full flex items-center justify-center bg-warm-900"
        style={{ minHeight: "110vh" }}
      >
        <Image
          src={heroImage}
          alt="GTV Experience — Interno Marche Design Hotel"
          fill
          className="object-cover opacity-30"
          sizes="100vw"
          priority
        />
        <div className="relative text-center px-8">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-[4rem] text-white leading-[1.2] tracking-tight">
            GTV Experience
            <br />
            Interno Marche Design Hotel
          </h1>
        </div>
      </section>

      {/* ── Intro — titolo + testo ───────────────────────────────── */}
      <section className="pt-20 md:pt-28 pb-20 md:pb-28">
        <div className="gtv-container-narrow">
          <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-8">
            GTV arreda gli spazi
            <br />
            prestigiosi di Interno Marche
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-6 text-left">
            Gebrüder Thonet Vienna GmbH (GTV) arreda gli spazi prestigiosi di
            Interno Marche, il primo Design Experience Hotel che racconta la
            storia di 100 anni di storia del design. Nel centro delle Marche, in
            un bellissimo scenario di piccoli borghi e dolci colline, nasce
            l&apos;hotel dei sogni di Franco Moschini, patron e attuale
            presidente di Gebrüder Thonet Vienna. Michele De Lucchi,
            GamFratesi, Vico Magistretti, Front e Nendo sono alcuni dei nomi
            celebri di architetti e designer che hanno collaborato con GTV e a
            cui si ispirano alcune delle stanze del design hotel, arricchite
            dalle loro opere più iconiche.
          </p>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-6 text-left">
            Protagonisti degli spazi raffinati come la lobby, il lounge bar e il
            patio, alcune delle creazioni più famose e contemporanee del brand,
            come la lounge Loie di Chiara Andreatti e il divano Targa di
            GamFratesi insieme al tavolino Arch Coffee Table di Front. La sedia
            Ample e i tavoli da bistrot, disegnati da Nichetto Studio, ricreano
            l&apos;inconfondibile atmosfera raffinata del bistrot viennese
            storico, arredando il ristorante e il patio con la nuova versione
            outdoor della famiglia Ample.{" "}
            <span className="font-bold">
              Con questa prestigiosa fornitura, Gebrüder Thonet Vienna si
              riconferma partner ideale per progetti contract sofisticati in
              tutto il mondo, grazie all&apos;eleganza raffinata delle linee e
              all&apos;alta qualit&agrave; del design delle sue creazioni.
            </span>
          </p>
        </div>
      </section>

      {/* ── Storie, Visioni, Ispirazioni — stile Born in Vienna ───── */}
      <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
          {/* Left: text */}
          <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              Storie, visioni, ispirazioni.
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-5">
              Interno Marche &egrave; il frutto di una visione che intreccia
              storia, arte e design. Un viaggio alla scoperta di Villa
              Gabrielli, una dimora storica nel cuore delle colline marchigiane,
              dove ogni scelta materica e di arredo racconta la stessa passione
              per l&apos;eccellenza.
            </p>
          </div>

          {/* Right: image */}
          <div className="relative bg-warm-200" style={{ aspectRatio: "16/9" }}>
            <Image
              src={imgs.stories}
              alt="Storie, visioni, ispirazioni — Interno Marche"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ── La rinascita di Villa Gabrielli — titolo + testo ──────── */}
      <section className="pt-20 md:pt-28 pb-16 md:pb-20">
        <div className="gtv-container-narrow">
          <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-8">
            La rinascita di Villa Gabrielli
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal text-left">
            Villa Gabrielli, un gioiello tardo Liberty, simbolo dello sviluppo
            della citt&agrave; di Tolentino nel secolo scorso. Nel 1922,
            l&apos;edificio era inizialmente una fabbrica e la residenza
            dell&apos;imprenditore Nazareno Gabrielli, creatore del famoso
            marchio di moda italiano. Dopo di lui, divenne il primo sito
            produttivo della nuova Poltrona Frau e la residenza di Franco
            Moschini. Il patrimonio del luogo &egrave; conservato nel progetto
            Interno Marche, che ha ripensato e ricreato con cura questi spazi di
            lavoro, famiglia, vita vissuta e li ha cos&igrave; restituiti alla
            citt&agrave;.
          </p>
        </div>
      </section>

      {/* ── Lobby — stile La Tecnica ─────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-[95%] max-w-[90%]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-28 items-start">
            {/* Left: text — 60% */}
            <div className="lg:col-span-7">
              <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mb-8">
                Lobby
              </h2>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                Il Foyer &egrave; il punto di arrivo e partenza, un ambiente
                espressivo e di grande impatto, dove le sedute iconiche di GTV
                accolgono gli ospiti in un&apos;atmosfera sospesa tra classico e
                contemporaneo.
              </p>
            </div>

            {/* Right: image — 40% */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square bg-warm-100 overflow-hidden">
                <Image
                  src={imgs.lobby}
                  alt="Lobby — Interno Marche Design Hotel"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Due immagini affiancate — full-width ─────────────────── */}
      <section className="pb-20 md:pb-28">
        <div className="px-4 md:px-6">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="relative aspect-[16/10] bg-warm-100 overflow-hidden">
            <Image
              src={imgs["landscape-1"]}
              alt="Interno Marche — veduta 1"
              fill
              className="object-cover"
              sizes="50vw"
            />
          </div>
          <div className="relative aspect-[16/10] bg-warm-100 overflow-hidden">
            <Image
              src={imgs["landscape-2"]}
              alt="Interno Marche — veduta 2"
              fill
              className="object-cover"
              sizes="50vw"
            />
          </div>
          </div>
        </div>
      </section>

      {/* ── I Corridoi — stile Il Brevetto (immagine sx, testo dx) ── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto w-[95%] max-w-[90%]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-28 items-start">
            {/* Left: image — 40% */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square bg-warm-100 overflow-hidden">
                <Image
                  src={imgs.corridors}
                  alt="I corridoi — Interno Marche Design Hotel"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </div>

            {/* Right: text — 60% */}
            <div className="lg:col-span-7 lg:pr-12 xl:pr-20">
              <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mb-8">
                I corridoi
              </h2>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                I corridoi diventano spazi espositivi, gallerie intime dove le
                creazioni GTV punteggiano il percorso, trasformando il semplice
                passaggio in un&apos;esperienza estetica. Pezzi di design che
                dialogano con le superfici e la luce naturale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tre immagini verticali — stile L'espansione ──────────── */}
      <section className="pb-10 md:pb-16">
        <div className="px-4 md:px-6">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
              <Image
                src={imgs["camera-1"]}
                alt="Interno Marche — camera 1"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 33vw"
              />
            </div>
            <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
              <Image
                src={imgs["camera-2"]}
                alt="Interno Marche — camera 2"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 33vw"
              />
            </div>
            <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
              <Image
                src={imgs["camera-3"]}
                alt="Interno Marche — camera 3"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 33vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 30 camere iconiche — titolo grande ───────────────────── */}
      <section className="pb-16 md:pb-20">
        <div className="gtv-container-narrow">
          <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center">
            30 camere iconiche.
          </h2>
        </div>
      </section>

      {/* ── Slideshow camere ────────────────────────────────────── */}
      <ExperienceCarousel
        images={[
          { src: imgs["carousel-1"], alt: "Magistretti — Interno Marche" },
          { src: imgs["carousel-2"], alt: "Secessione Viennese — Interno Marche" },
          { src: imgs["carousel-3"], alt: "Arts & Crafts — Interno Marche" },
          { src: imgs["carousel-4"], alt: "Thonet 303 — Interno Marche" },
          { src: imgs["carousel-5"], alt: "Thonet 303 — Interno Marche" },
        ]}
      />

      {/* ── Vivi la GTV Experience — stile Born in Vienna (img sx) ── */}
      <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
          {/* Left: image */}
          <div className="relative bg-warm-200" style={{ aspectRatio: "16/9" }}>
            <Image
              src={imgs.gamfratesi}
              alt="Vivi la GTV Experience"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Right: text */}
          <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              Vivi la GTV Experience
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-5">
              Interno Marche &egrave; un invito a vivere il design nella sua
              dimensione più autentica. Scopri il fascino delle collezioni GTV
              immerse in un contesto unico, dove ogni stanza racconta una storia
              diversa e ogni dettaglio &egrave; pensato per emozionare.
            </p>
          </div>
        </div>
      </section>

      {/* ── Potrebbe Interessarti Anche ───────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-[90%] max-w-[75%]">
          <h3 className="text-center uppercase text-[16px] tracking-[0.03em] text-black font-light mb-12">
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
          <span className="text-warm-600">GTV Experience</span>
        </nav>
      </div>
    </>
  );
}
