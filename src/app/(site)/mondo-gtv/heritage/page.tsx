import Image from "next/image";
import Link from "next/link";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
import { tBatch } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heritage | Gebrüder Thonet Vienna",
  description:
    "Le origini di Gebrüder Thonet: dalla Vienna del 1853 alla tradizione del legno curvato. Scopri la storia di GTV.",
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
  "thonet-family": "/images/Michael-Thonet-centre-with-his-five-sons.jpg",
  "sedia-n1": "/images/heritage-sedia-n1.webp",
  "sedia-n4": "/images/heritage-sedia-n4.webp",
  "hayworth-kelly": "/images/hayworth-kelly.webp",
  "le-corbusier": "/images/le-corbusier.webp",
  "winston-churchill": "/images/winston-churchill.webp",
  "heritage-journal": "/images/heritage-journal.webp",
  "coin-authenticity": "/images/GTV-coin-authenticity.jpg",
};

export default async function HeritagePage() {
  const [imgs, cardImages, T] = await Promise.all([
    getPageImages("heritage", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
    tBatch([
      "heritage.title",
      "heritage.family.description",
      "heritage.innovation.title",
      "heritage.innovation.p1",
      "heritage.innovation.p2",
      "heritage.expansion.title",
      "heritage.postwar.p1",
      "heritage.postwar.p2",
      "heritage.postwar.p3",
      "heritage.today.p1",
      "heritage.today.p2",
      "heritage.coin.title",
      "heritage.coin.description",
      "heritage.breadcrumb",
      "common.related",
      "common.breadcrumb_home",
      "nav.world",
    ]),
  ]);

  return (
    <>
      <section className="gtv-container pt-16 pb-16">
        <h1 className="font-serif text-[34px] md:text-[44px] text-black tracking-tight text-center font-light">
          {T["heritage.title"]}
        </h1>
      </section>

      {/* ── Foto famiglia + testo ─────────────────────────────────── */}
      <section className="pb-20">
        <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
            {/* Left: family photo — aspect 16/10 = ratio nativo della foto (1000x625), zero crop */}
            <div className="relative bg-warm-100 overflow-hidden" style={{ aspectRatio: "16 / 10", marginRight: "10px" }}>
              <Image
                src={imgs["thonet-family"]}
                alt="Michael Thonet e i suoi cinque figli"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
            {/* Right: text */}
            <div className="flex flex-col justify-start" style={{ paddingTop: "10px", paddingLeft: "151px", paddingRight: "0" }}>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                {T["heritage.family.description"]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── L'innovazione e il successo industriale ───────────────── */}
      <section className="pb-20 md:pb-28">
        <div className="gtv-container">
          <h2 className="font-serif text-[32px] md:text-[44px] text-black leading-[1.15] mb-12 text-center">
            {T["heritage.innovation.title"]}
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mb-6">
            {T["heritage.innovation.p1"]}
          </p>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mb-16">
            {T["heritage.innovation.p2"]}
          </p>

          {/* 2 vertical images — 20px piu strette, 10px meno alte (poi -5px ciascuna) */}
          <div className="mx-auto" style={{ maxWidth: "73.5%" }}>
            <div className="grid grid-cols-2" style={{ gap: "79px" }}>
              <div>
                <div className="relative aspect-[5/7.2] bg-warm-100 overflow-hidden">
                  <Image
                    src={imgs["sedia-n1"]}
                    alt="Sedia Thonet N.1 — Michael Thonet"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 35vw"
                  />
                </div>
                <p className="text-xs text-black mt-3 font-light text-center">
                  N. 1 — Michael Thonet
                </p>
              </div>
              <div>
                <div className="relative aspect-[5/7.2] bg-warm-100 overflow-hidden">
                  <Image
                    src={imgs["sedia-n4"]}
                    alt="Sedia Thonet N.4 — Michael Thonet"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 35vw"
                  />
                </div>
                <p className="text-xs text-black mt-3 font-light text-center">
                  N. 4 — Michael Thonet
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── L'espansione e la trasformazione ──────────────────────── */}
      <section className="pb-10 md:pb-16">
        <div className="gtv-container">
          <h2 className="font-serif text-[32px] md:text-[44px] text-black leading-[1.15] mb-12 text-center">
            {T["heritage.expansion.title"]}
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mb-16">
            Consapevolezza tecnologiche e di alto livello, diffusione dei
            prodotti e notoriet&agrave; dell&apos;azienda spinsero i
            pi&ugrave; importanti architetti viennesi a progettare nuovi
            prodotti. Otto Wagner fece realizzare gli arredi per la
            Postsparkasse. Adolf Loos realizz&ograve; la sedia per il
            Caf&eacute; Museum e si dedic&ograve; alla progettazione del 1899.
            &ldquo;Quando ero in America comprai che la sedia Thonet si seduta
            dal re.&rdquo;
          </p>
        </div>

        {/* 3 vertical images with captions — full width like product cards grid */}
        <div className="px-2 md:px-3 lg:px-4">
          <div className="grid grid-cols-3 gap-x-3 md:gap-x-4">
            <div>
              <div className="relative aspect-[2/3] bg-warm-100 overflow-hidden">
                <Image
                  src={imgs["hayworth-kelly"]}
                  alt="Rita Hayworth and Gene Kelly"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 33vw"
                />
              </div>
              <p className="text-xs text-black mt-3 font-light text-center">
                Rita Hayworth and Gene Kelly (Ned Scott/John Kobal Foundation/Getty Images)
              </p>
            </div>
            <div>
              <div className="relative aspect-[2/3] bg-warm-100 overflow-hidden">
                <Image
                  src={imgs["le-corbusier"]}
                  alt="Le Corbusier"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 33vw"
                />
              </div>
              <p className="text-xs text-black mt-3 font-light text-center">
                Le Corbusier (Wolfgang Kuhn/United Archives via Getty Images)
              </p>
            </div>
            <div>
              <div className="relative aspect-[2/3] bg-warm-100 overflow-hidden">
                <Image
                  src={imgs["winston-churchill"]}
                  alt="Winston Churchill"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 33vw"
                />
              </div>
              <p className="text-xs text-black mt-3 font-light text-center">
                Winston Churchill (CPT TANNER &mdash; No 2 Army Film and /AFP/Getty Images)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testo storico + immagine — same width wrapper as 1st section ── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto" style={{ width: "calc(90% - 100px)", maxWidth: "calc(90% - 100px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start">
            {/* Left: text — same paddings as 1st section right column */}
            <div className="flex flex-col" style={{ paddingTop: "10px", paddingLeft: "0", paddingRight: "60px" }}>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-8">
                {T["heritage.postwar.p1"]}
              </p>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-8">
                {T["heritage.postwar.p2"]}
              </p>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                {T["heritage.postwar.p3"]}
              </p>
            </div>

            {/* Right: image */}
            <div className="flex items-center justify-center">
              <Image
                src={imgs["heritage-journal"]}
                alt="Heritage — Gebrüder Thonet Vienna"
                width={500}
                height={500}
                className="h-auto object-contain max-w-[80%]"
                sizes="(max-width: 1024px) 80vw, 40vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── GTV Oggi: tradizione e innovazione ───────────────────── */}
      <section className="pb-20 md:pb-28">
        <div className="gtv-container">
          <h2 className="font-serif text-[32px] md:text-[44px] text-black leading-[1.15] mb-24 text-center">
            Gebrüder Thonet Vienna oggi:
            <br />
            tradizione e innovazione
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mb-6">
            {T["heritage.today.p1"]}
          </p>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            {T["heritage.today.p2"]}
          </p>
        </div>
      </section>

      {/* ── La "Moneta" GTV — stesso stile Our Heritage brand manifesto */}
      <section className="w-full bg-warm-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left: image */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
            <Image
              src={imgs["coin-authenticity"]}
              alt="La Moneta GTV — simbolo di autenticità"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Right: text */}
          <div className="flex flex-col justify-center" style={{ padding: "96px 150px" }}>
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              {T["heritage.coin.title"]}
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
              {T["heritage.coin.description"]}
            </p>
          </div>
        </div>
      </section>

      {/* ── Potrebbe Interessarti Anche — stessa larghezza N1/N4 ─── */}
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
          <span>{T["heritage.breadcrumb"]}</span>
        </div>
      </div>
    </>
  );
}
