import Image from "next/image";
import Link from "next/link";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
import { tBatch } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Manifesto | Gebrüder Thonet Vienna",
  description:
    "Born in Vienna. Made in Italy. Designed around the world. Scopri la storia e i valori di GTV.",
};

const RELATED_PAGES = [
  { page: "heritage", label: "Heritage", href: "/mondo-gtv/heritage" },
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
  "born-in-vienna": "/images/michael-thonet-1853.jpg",
  "designers-image": "/images/michael-thonet-1853.jpg",
};

export default async function BrandManifestoPage() {
  const T = await tBatch([
    "brand-manifesto.subtitle",
    "brand-manifesto.intro",
    "brand-manifesto.heritage.label",
    "brand-manifesto.heritage.title",
    "brand-manifesto.heritage.description",
    "brand-manifesto.heritage.cta",
    "brand-manifesto.production.label",
    "brand-manifesto.production.title",
    "brand-manifesto.production.description",
    "brand-manifesto.wood-harmony.title",
    "brand-manifesto.wood-harmony.cta",
    "brand-manifesto.designers.label",
    "brand-manifesto.designers.title",
    "brand-manifesto.designers.description",
    "brand-manifesto.breadcrumb",
    "common.related",
    "common.breadcrumb_home",
    "nav.world",
  ]);
  const [imgs, cardImages] = await Promise.all([
    getPageImages("brand-manifesto", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
  ]);

  return (
    <>
      <section className="gtv-container pt-24 md:pt-32 pb-4">
        <p className="uppercase text-[20px] tracking-[0.03em] text-black font-light mb-4 text-center">{T["brand-manifesto.subtitle"]}</p>
        <h1 className="font-serif text-[42px] md:text-[58px] text-black tracking-tight text-center font-light leading-[1.2]">
          <em>Born</em> in Vienna.
          <br />
          Made in <em>Italy.</em>
          <br />
          <em>Designed</em> around the world.
        </h1>
      </section>

      {/* ── Intro paragraph ───────────────────────────────────────── */}
      <section className="gtv-container pt-20 md:pt-28 pb-14 md:pb-20">
        <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px]" style={{ marginLeft: "auto", marginRight: "auto" }}>
            {T["brand-manifesto.intro"]}
          </p>
      </section>

      {/* ── Our Heritage – Born in Vienna ──────────────────────────── */}
      <section className="w-full bg-warm-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left: historical image — same aspect as product page */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
            <Image
              src={imgs["born-in-vienna"]}
              alt="Michael Thonet 1853 — Gebrüder Thonet"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Right: text — same style as product page description */}
          <div className="flex flex-col justify-center" style={{ padding: "96px 150px" }}>
            <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-1.5">{T["brand-manifesto.heritage.label"]}</p>
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              {T["brand-manifesto.heritage.title"]}
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
              {T["brand-manifesto.heritage.description"]}
            </p>
            <Link
              href="/mondo-gtv/heritage"
              className="inline-block mt-8 uppercase text-[16px] tracking-[0.03em] text-black font-medium hover:underline"
              style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
            >
              {T["brand-manifesto.heritage.cta"]}
            </Link>
          </div>
        </div>
      </section>

      {/* ── La Produzione – Made in Italy ──────────────────────────── */}
      <section className="gtv-container" style={{ paddingTop: "96px", paddingBottom: "85px" }}>
        <div className="max-w-[940px] mx-auto">
          <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-1.5">{T["brand-manifesto.production.label"]}</p>
          <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
            {T["brand-manifesto.production.title"]}
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
            {T["brand-manifesto.production.description"]}
          </p>
        </div>
      </section>

      {/* ── L'Armonia del Legno (VIDEO) — stesso stile homepage ───── */}
      <section className="w-full px-1 md:px-2 lg:px-3">
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/images/armonia-del-legno.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-14 md:top-18 lg:top-22 left-7 md:left-12 lg:left-16">
            <h2 className="font-sans text-2xl md:text-3xl lg:text-[38px] text-white/80 font-light uppercase tracking-[inherit] leading-snug">
              {T["brand-manifesto.wood-harmony.title"]}
            </h2>
            <Link
              href="/mondo-gtv/curvatura-legno"
              className="inline-block mt-[16px] uppercase text-[16px] tracking-[0.03em] text-white font-medium transition-colors hover:underline"
              style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
            >
              {T["brand-manifesto.wood-harmony.cta"]}
            </Link>
          </div>
        </div>
      </section>

      {/* ── I Nostri Designer – Designed Around the World ─────────── */}
      <section className="w-full bg-warm-50 mt-20 md:mt-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left: text — same style/padding as Our Heritage */}
          <div className="flex flex-col justify-center" style={{ padding: "96px 150px" }}>
            <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-1.5">{T["brand-manifesto.designers.label"]}</p>
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              {T["brand-manifesto.designers.title"]}
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
              {T["brand-manifesto.designers.description"]}
            </p>
          </div>

          {/* Right: full image — admin configurable, width full, crop only top/bottom */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 3.62" }}>
            <Image
              src={imgs["designers-image"]}
              alt={T["brand-manifesto.designers.title"]}
              fill
              quality={95}
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ── Potrebbe Interessarti Anche ───────────────────────────── */}
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
                        sizes="(max-width: 768px) 100vw, 33vw"
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
          <span>{T["brand-manifesto.breadcrumb"]}</span>
        </div>
      </div>
    </>
  );
}
