import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
import { tBatch } from "@/lib/i18n";
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
  const [heroSlide, imgs, cardImages, T] = await Promise.all([
    prisma.heroSlide.findFirst({
      where: { page: "gtv-experience", isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPageImages("gtv-experience", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
    tBatch([
      "gtv-experience.hero.title",
      "gtv-experience.intro.title",
      "gtv-experience.intro.p1",
      "gtv-experience.stories.title",
      "gtv-experience.stories.description",
      "gtv-experience.villa.title",
      "gtv-experience.villa.description",
      "gtv-experience.lobby.title",
      "gtv-experience.lobby.description",
      "gtv-experience.corridors.title",
      "gtv-experience.corridors.description",
      "gtv-experience.rooms.title",
      "gtv-experience.live.title",
      "gtv-experience.live.description",
      "gtv-experience.breadcrumb",
      "common.related",
      "common.breadcrumb_home",
      "nav.world",
    ]),
  ]);

  const heroImage = heroSlide?.imageUrl || "/images/experience-hero.webp";

  return (
    <>
      {/* ── Hero — stessa altezza/comportamento della homepage ── */}
      <section
        className="relative w-full overflow-hidden bg-warm-900"
        style={{ height: "min(118vh, 1107px)" }}
      >
        <Image
          src={heroImage}
          alt="GTV Experience — Interno Marche Design Hotel"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center text-center px-8">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-[4rem] text-white leading-[1.2] tracking-tight whitespace-pre-line">
            {T["gtv-experience.hero.title"]}
          </h1>
        </div>
      </section>

      {/* ── Intro — titolo + testo ───────────────────────────────── */}
      <section className="pt-20 md:pt-28 pb-20 md:pb-28">
        <div className="gtv-container">
          <h2 className="font-serif text-[44px] text-black leading-[1.15] text-center max-w-[940px] mx-auto whitespace-pre-line" style={{ marginBottom: "63px" }}>
            {T["gtv-experience.intro.title"]}
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-6 text-left max-w-[940px] mx-auto">
            {T["gtv-experience.intro.p1"]}
          </p>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-6 text-left max-w-[940px] mx-auto">
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

      {/* ── Storie, Visioni, Ispirazioni — stile "Born in Vienna" (testo sx, img dx) ──── */}
      <section className="w-full bg-warm-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left: text */}
          <div className="flex flex-col justify-center px-6 py-12 lg:px-[150px] lg:py-24">
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              {T["gtv-experience.stories.title"]}
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
              {T["gtv-experience.stories.description"]}
            </p>
          </div>

          {/* Right: image */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
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

      {/* ── La rinascita di Villa Gabrielli — stesso stile "GTV arreda" ──── */}
      <section className="pt-20 md:pt-28 pb-20 md:pb-28">
        <div className="gtv-container">
          <h2 className="font-serif text-[44px] text-black leading-[1.15] text-center max-w-[940px] mx-auto" style={{ marginBottom: "63px" }}>
            {T["gtv-experience.villa.title"]}
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal text-left max-w-[940px] mx-auto">
            {T["gtv-experience.villa.description"]}
          </p>
        </div>
      </section>

      {/* ── Lobby — stesso stile/layout di "La Tecnica" ─────────── */}
      <section className="pt-20 pb-20 md:pb-28">
        <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
            {/* Left: text */}
            <div className="flex flex-col" style={{ paddingTop: "10px", paddingLeft: "0", paddingRight: "60px" }}>
              <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                {T["gtv-experience.lobby.title"]}
              </h2>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8 mb-6">
                {T["gtv-experience.lobby.description"]}
              </p>
            </div>

            {/* Right: image — flush right, square */}
            <div className="relative aspect-square bg-warm-100 overflow-hidden ml-auto" style={{ maxWidth: "76%", width: "100%" }}>
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
      </section>

      {/* ── Due immagini affiancate — larghezza grid prodotti ──── */}
      <section className="pb-20 md:pb-28">
        <div className="px-2 md:px-3 lg:px-4">
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

      {/* ── I Corridoi — stesso stile/layout di "Il Brevetto" ──── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
            {/* Left: image — flush left, square */}
            <div className="relative aspect-square bg-warm-100 overflow-hidden mr-auto" style={{ maxWidth: "76%", width: "100%" }}>
              <Image
                src={imgs.corridors}
                alt="I corridoi — Interno Marche Design Hotel"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>

            {/* Right: text */}
            <div className="flex flex-col" style={{ paddingTop: "10px", paddingLeft: "60px", paddingRight: "0" }}>
              <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                {T["gtv-experience.corridors.title"]}
              </h2>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8 mb-6">
                {T["gtv-experience.corridors.description"]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tre immagini verticali — larghezza grid prodotti ─── */}
      <section className="pb-10 md:pb-16">
        <div className="px-2 md:px-3 lg:px-4">
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
      <section className="pb-8 md:pb-10">
        <div className="mx-auto max-w-5xl px-10 md:px-16 lg:px-20">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-black leading-[1.15] text-center">
            {T["gtv-experience.rooms.title"]}
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

      {/* ── Vivi la GTV Experience — stesso stile "Born in Vienna" brand-manifesto ── */}
      <section className="w-full bg-warm-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left: image — aspect 3/4.2 */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
            <Image
              src={imgs.gamfratesi}
              alt="Vivi la GTV Experience"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Right: text */}
          <div className="flex flex-col justify-center px-6 py-12 lg:px-[150px] lg:py-24">
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              {T["gtv-experience.live.title"]}
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
              {T["gtv-experience.live.description"]}
            </p>
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
          <span>{T["gtv-experience.breadcrumb"]}</span>
        </div>
      </div>
    </>
  );
}
