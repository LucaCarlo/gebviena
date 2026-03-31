import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "La Curvatura del Legno | Gebrüder Thonet Vienna",
  description:
    "La tecnica della curvatura del legno: un metodo antico perfezionato da Michael Thonet. Scopri il processo produttivo di GTV.",
};

const RELATED_PAGES = [
  {
    page: "brand-manifesto",
    label: "Brand Manifesto",
    href: "/mondo-gtv/brand-manifesto",
  },
  { page: "heritage", label: "Heritage", href: "/mondo-gtv/heritage" },
  {
    page: "sostenibilita",
    label: "Sostenibilit\u00e0",
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
  const [heroSlide, imgs, cardImages] = await Promise.all([
    prisma.heroSlide.findFirst({
      where: { page: "curvatura-legno", isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getPageImages("curvatura-legno", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
  ]);

  const heroImage = heroSlide?.imageUrl || "/images/curvatura-hero.webp";
  const heroTitle = heroSlide?.title || "La curvatura del legno";
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

      {/* ── Descrizione sotto la hero ────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="gtv-container-narrow">
          <p className="text-lg text-dark leading-[1.8] font-light">
            La tecnica della curvatura del legno &egrave; un metodo antico,
            presente nell&apos;artigianato di diverse civilt&agrave;, ma rimasto
            a lungo in secondo piano a causa del suo limitato vantaggio in
            termini di produttivit&agrave;.
          </p>
        </div>
      </section>

      {/* ── Video sezione — più largo, click-to-play ──────────── */}
      <section className="mx-auto w-[95%] max-w-[90%] relative" style={{ height: "70vh" }}>
        <video
          controls
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/images/armonia-del-legno.mp4" type="video/mp4" />
        </video>
      </section>

      {/* ── La Tecnica — testo sx 60%, immagine dx 40% ───────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-[95%] max-w-[90%]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-28 items-start">
            {/* Left: text — 60% */}
            <div className="lg:col-span-7">
              <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl text-dark mb-8 uppercase tracking-wide font-light">
                La Tecnica
              </h2>
              <p className="text-lg text-dark leading-[1.8] font-light mb-6">
                L&apos;intuizione di Michael Thonet nacque dall&apos;osservazione
                che il legno fresco &egrave; più flessibile di quello secco.
                Partendo da questa considerazione, Thonet e alcuni suoi
                contemporanei sperimentarono la curvatura di pacchetti di sottili
                fogli di legno, immersi in colla bollente e poi asciugati in forme
                rigide.
              </p>
              <p className="text-lg text-dark leading-[1.8] font-light">
                Tuttavia, questa soluzione non garantiva la resistenza del
                prodotto a causa della fragilità dell&apos;adesivo. Per superare
                questo problema, Thonet decise di lavorare esclusivamente sulle
                proprietà fisiche del legno, eliminando completamente la colla dai
                suoi processi. Per ottenere una maggiore flessibilità del
                materiale &mdash; anche dopo l&apos;essiccamento &mdash; aumentò
                la scivolosità tra le fibre esponendole in un ambiente altamente
                umido.
              </p>
            </div>

            {/* Right: image — 40% */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square bg-warm-100 overflow-hidden">
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
        </div>
      </section>

      {/* ── Immagine orizzontale centrale — stessa larghezza del vecchio video ── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto w-[90%] max-w-[75%]">
          <div className="relative aspect-[16/9] bg-warm-100 overflow-hidden">
            <Image
              src={imgs["curvatura-detail"]}
              alt="La curvatura del legno — dettaglio"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 75vw"
            />
          </div>
        </div>
      </section>

      {/* ── Il Brevetto — immagine sx 40%, testo dx 60% ──────────── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto w-[95%] max-w-[90%]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-28 items-start">
            {/* Left: image — 40% */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square bg-warm-100 overflow-hidden">
                <Image
                  src={imgs.brevetto}
                  alt="Il brevetto Thonet"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </div>

            {/* Right: text — 60% */}
            <div className="lg:col-span-7 lg:pr-12 xl:pr-20">
              <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl text-dark mb-8 uppercase tracking-wide font-light">
                Il Brevetto
              </h2>
              <p className="text-lg text-dark leading-[1.8] font-light mb-6">
                Nel 1842, Michael Thonet brevettò il processo che lo rese famoso
                in tutto il mondo: le strisce di legno (preferibilmente faggio,
                grazie alla sua fibra lunga, regolare e senza nodi) venivano
                tornite, poste in autoclave per assorbire umidità, piegate con
                forza e fissate in stampi metallici, per poi essere essiccate.
                Dopo la finitura dei pezzi, veniva assemblata la &ldquo;sedia di
                Vienna&rdquo;, un elemento distintivo dell&apos;azienda.
              </p>
              <p className="text-lg text-dark leading-[1.8] font-light">
                Un vero e proprio processo industriale, accompagnato dalla
                progressiva eliminazione di ornamenti e giunzioni, a favore di
                linee rigorose e di una maggiore semplificazione degli elementi di
                assemblaggio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Paragrafo chiusura ────────────────────────────────────── */}
      <section className="pt-2 md:pt-4 pb-20 md:pb-28">
        <div className="gtv-container-narrow">
          <p className="text-lg text-dark leading-[1.8] font-light">
            Eleganza formale, solidità e leggerezza hanno decretato il
            successo dell&apos;azienda, che in pochi anni ha aperto
            stabilimenti produttivi in tutto il mondo. Un metodo di produzione
            unico, radicato in una storia ricca di ispirazioni, che oggi si
            rinnova attraverso la scelta di materiali di alta qualità. I legni,
            selezionati per resistenza e versatilità, si combinano con tessuti
            pregiati, arricchendo la collezione con raffinate sfumature
            cromatiche.
          </p>
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
          <span className="text-warm-600">La Curvatura del Legno</span>
        </nav>
      </div>
    </>
  );
}
