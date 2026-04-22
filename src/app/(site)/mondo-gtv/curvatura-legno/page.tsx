import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
import { tBatch } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "La Curvatura del Legno | Gebrüder Thonet Vienna",
  description:
    "La tecnica della curvatura del legno: un metodo antico perfezionato da Michael Thonet. Scopri il processo produttivo di GTV.",
};

const RELATED_PAGES = [
  {
    page: "brand-manifesto",
    labelKey: "menu.world.manifesto",
    href: "/mondo-gtv/brand-manifesto",
  },
  { page: "heritage", labelKey: "menu.world.heritage", href: "/mondo-gtv/heritage" },
  {
    page: "sostenibilita",
    labelKey: "menu.world.sustainability",
    href: "/mondo-gtv/sostenibilita",
  },
];

const DEFAULTS: Record<string, string> = {
  "tecnica-legname": "/images/tecnica-legname.webp",
  "curvatura-detail": "/images/curvatura-img-1536x865.webp",
  brevetto: "/images/curvatura-brevetto.webp",
};

export default async function CurvaturaLegnoPage() {
  // Fetch hero slide for this page
  const [heroSlide, imgs, cardImages, T] = await Promise.all([
    prisma.heroSlide.findFirst({
      where: { page: "curvatura-legno", isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPageImages("curvatura-legno", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
    tBatch([
      "curvatura-legno.title",
      "curvatura-legno.intro",
      "curvatura-legno.technique.title",
      "curvatura-legno.technique.p1",
      "curvatura-legno.technique.p2",
      "curvatura-legno.patent.title",
      "curvatura-legno.patent.p1",
      "curvatura-legno.patent.p2",
      "curvatura-legno.conclusion",
      "curvatura-legno.breadcrumb",
      "common.related",
      "common.breadcrumb_home",
      "nav.world",
      ...RELATED_PAGES.map((p) => p.labelKey),
    ]),
  ]);

  const heroImage = heroSlide?.imageUrl || "/images/curvatura-hero.webp";
  const heroTitle = heroSlide?.title || T["curvatura-legno.title"];
  const heroSubtitle = heroSlide?.subtitle || null;
  const heroImagePosition = heroSlide?.imagePosition || "center center";

  return (
    <>
      {/* ── Hero — stessa altezza dell'hero del prodotto singolo (aspect 16/9), strutturata identica ── */}
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

      {/* ── Descrizione sotto la hero — stile paragrafo standard ─── */}
      <section className="py-20">
        <div className="gtv-container">
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            {T["curvatura-legno.intro"]}
          </p>
        </div>
      </section>

      {/* ── Video sezione — stessa larghezza di "La Tecnica" ───── */}
      <section>
        <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <video
              controls
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/images/armonia-del-legno.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* ── La Tecnica — stesso wrapper di heritage 1a sezione, testo sx + immagine dx allineata ─── */}
      <section className="pt-20 pb-20 md:pb-28">
        <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
            {/* Left: text */}
            <div className="flex flex-col" style={{ paddingTop: "10px", paddingLeft: "0", paddingRight: "60px" }}>
              <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                {T["curvatura-legno.technique.title"]}
              </h2>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8 mb-6">
                {T["curvatura-legno.technique.p1"]}
              </p>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                {T["curvatura-legno.technique.p2"]}
              </p>
            </div>

            {/* Right: image — flush right, square (matcha source 916x916) */}
            <div className="relative aspect-square bg-warm-100 overflow-hidden ml-auto" style={{ maxWidth: "76%", width: "100%" }}>
              <Image
                src={imgs["tecnica-legname"]}
                alt="La tecnica della curvatura del legno"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Immagine orizzontale centrale — leggermente piu stretta delle card "Potrebbe Interessarti" ── */}
      <section className="pb-20 md:pb-28">
        <div className="gtv-container">
          <div className="mx-auto" style={{ maxWidth: "72%" }}>
            <div className="relative aspect-[16/9] bg-warm-100 overflow-hidden">
              <Image
                src={imgs["curvatura-detail"]}
                alt="La curvatura del legno — dettaglio"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 72vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Il Brevetto — stesso wrapper, immagine sx allineata, testo dx ── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
            {/* Left: image — flush left, square (matcha source 768x769) */}
            <div className="relative aspect-square bg-warm-100 overflow-hidden mr-auto" style={{ maxWidth: "76%", width: "100%" }}>
              <Image
                src={imgs.brevetto}
                alt="Il brevetto Thonet"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>

            {/* Right: text */}
            <div className="flex flex-col" style={{ paddingTop: "10px", paddingLeft: "60px", paddingRight: "0" }}>
              <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                {T["curvatura-legno.patent.title"]}
              </h2>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8 mb-6">
                {T["curvatura-legno.patent.p1"]}
              </p>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                {T["curvatura-legno.patent.p2"]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Paragrafo chiusura — stile standard, ulteriormente ridotto ── */}
      <section className="pt-5 pb-10">
        <div className="gtv-container">
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            {T["curvatura-legno.conclusion"]}
          </p>
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
              const label = T[rp.labelKey];
              return (
                <Link key={rp.page} href={rp.href} className="group block">
                  <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
                    {coverSrc ? (
                      <Image
                        src={coverSrc}
                        alt={label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-warm-200" />
                    )}
                  </div>
                  <h4 className="font-sans text-[22px] md:text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mt-4">
                    {label}
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
          <span>{T["curvatura-legno.breadcrumb"]}</span>
        </div>
      </div>
    </>
  );
}
