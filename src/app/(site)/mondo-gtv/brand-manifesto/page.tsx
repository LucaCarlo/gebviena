import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
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
};

export default async function BrandManifestoPage() {
  const [imgs, cardImages, designers] = await Promise.all([
    getPageImages("brand-manifesto", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
    prisma.designer.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, imageUrl: true },
      take: 9,
    }),
  ]);

  return (
    <>
      <section className="gtv-container pt-16 pb-10">
        <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-3 text-center">Brand manifesto</p>
        <h1 className="font-serif text-[38px] md:text-[48px] text-black tracking-tight text-center font-light leading-[1.2]">
          Born in Vienna.
          <br />
          Made in Italy.
          <br />
          Designed around the world.
        </h1>
      </section>

      {/* ── Intro paragraph ───────────────────────────────────────── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto max-w-5xl px-10 md:px-16 lg:px-20">
          <p className="text-[20px] text-black leading-snug font-light tracking-normal">
            Ogni parola riflette una parte fondamentale della nostra essenza: la
            nostra origine storica, l&apos;eccellenza artigianale e la nostra
            visione globale. Non &egrave; semplicemente un claim, ma un viaggio
            che attraversa il tempo, la cultura e le tradizioni, per raccontare
            un brand che nasce in un angolo dell&apos;Europa, si esprime in un
            altro e si proietta verso il mondo intero. Ogni nostro prodotto
            &egrave; un simbolo di questa fusione: un&apos;unione tra passato e
            futuro, artigianato e design contemporaneo, locale e globale.
          </p>
        </div>
      </section>

      {/* ── Our Heritage – Born in Vienna ──────────────────────────── */}
      <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
          {/* Left: historical image — 50% width, full height */}
          <div className="relative bg-warm-200" style={{ aspectRatio: "16/9" }}>
            <Image
              src={imgs["born-in-vienna"]}
              alt="Michael Thonet 1853 — Gebrüder Thonet"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Right: text — 50% width, vertically centered, generous padding */}
          <div className="px-10 md:px-16 lg:px-20 py-16 lg:py-20 flex flex-col justify-center">
            <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-1.5">Our Heritage</p>
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              Born in Vienna
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
              La tradizione viennese, intrisa di arte e ingegno, &egrave; il
              nostro fondamento, un&apos;eredit&agrave; che ci accompagna in ogni
              creazione. Ma non ci fermiamo qui: il nostro sapere artigianale non
              &egrave; mai statico, evolve e si rinnova per raccontare storie
              nuove.
            </p>
            <Link
              href="/mondo-gtv/heritage"
              className="inline-flex items-center gap-2 mt-6 uppercase text-sm tracking-[0.15em] font-light text-dark hover:opacity-60 transition-opacity"
            >
              Le nostre origini
              <span className="text-lg">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── La Produzione – Made in Italy ──────────────────────────── */}
      <section className="section-padding">
        <div className="mx-auto max-w-5xl px-10 md:px-16 lg:px-20">
          <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-1.5">La Produzione</p>
          <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
            Made in Italy
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
            L&apos;incontro perfetto tra la nostra eredit&agrave; e la maestria
            artigianale italiana. In Italia, dove il design &egrave;
            un&apos;arte quotidiana, ogni prodotto nasce dall&apos;incontro di
            materiali pregiati e abilit&agrave; artigianali che definiscono una
            qualit&agrave; senza tempo. Qui, la bellezza si mescola con la
            funzionalit&agrave;, creando pezzi che diventano iconici e
            resistenti, destinati a durare.
          </p>
        </div>
      </section>

      {/* ── L'Armonia del Legno (VIDEO) ────────────────────────────── */}
      <section className="relative w-full" style={{ height: "90vh" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover brightness-[0.45]"
        >
          <source src="/images/armonia-del-legno.mp4" type="video/mp4" />
        </video>
        <div className="absolute top-12 md:top-16 lg:top-20 left-8 md:left-16 lg:left-20 max-w-lg">
          <h2 className="font-sans text-2xl md:text-3xl lg:text-[2.5rem] text-white font-light uppercase tracking-wide leading-snug">
            L&apos;armonia del legno
          </h2>
          <Link
            href="/mondo-gtv/curvatura-legno"
            className="inline-flex items-center gap-2 mt-4 md:mt-5 uppercase text-sm tracking-[0.15em] font-light text-white/80 hover:text-white transition-colors"
          >
            Scopri l&apos;arte del legno curvato
            <span className="text-lg">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* ── I Nostri Designer – Designed Around the World ─────────── */}
      <section className="w-full bg-warm-50 mt-20 md:mt-28" style={{ minHeight: "100vh" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0" style={{ minHeight: "100vh" }}>
          {/* Left: text — 50%, vertically centered, same style as Heritage */}
          <div className="px-10 md:px-16 lg:px-20 py-16 lg:py-20 flex flex-col justify-center">
            <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-1.5">I Nostri Designer</p>
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              Designed around
              <br />
              the world
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
              Collaboriamo con alcuni dei pi&ugrave; grandi maestri del design
              contemporaneo, provenienti da culture e background diversi, per
              reinterpretare la nostra eredit&agrave; con uno sguardo sempre
              nuovo. Ogni pezzo &egrave; il risultato di un dialogo tra
              passato e futuro, tra il saper fare artigianale e
              l&apos;innovazione estetica, dando vita a collezioni che si
              inseriscono con naturalezza in contesti internazionali: un
              racconto che continua a evolversi, senza mai perdere la propria
              identit&agrave;.
            </p>
          </div>

          {/* Right: 3x3 designer grid — 50%, fills entire right half, vertical images */}
          <div className="grid grid-cols-3 grid-rows-3 gap-3 md:gap-4">
            {designers.map((designer) => (
              <Link
                key={designer.id}
                href={`/designers/${designer.slug}`}
                className="group relative bg-warm-200 overflow-hidden"
              >
                {designer.imageUrl ? (
                  <Image
                    src={designer.imageUrl}
                    alt={designer.name}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    sizes="(max-width: 768px) 33vw, 17vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-serif text-4xl text-warm-300">
                      {designer.name.charAt(0)}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Potrebbe Interessarti Anche ───────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-[90%] max-w-[75%]">
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
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
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
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <Link href="/mondo-gtv">Mondo GTV</Link>
          <span>&gt;</span>
          <span>Brand Manifesto</span>
        </div>
      </div>
    </>
  );
}
