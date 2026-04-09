import Image from "next/image";
import Link from "next/link";
import { getPageImages, getRelatedCardImages } from "@/lib/page-images";
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
  const [imgs, cardImages] = await Promise.all([
    getPageImages("heritage", DEFAULTS),
    getRelatedCardImages(RELATED_PAGES.map((p) => p.page)),
  ]);

  return (
    <>
      <section className="gtv-container pt-16 pb-10">
        <h1 className="font-serif text-[34px] md:text-[44px] text-black tracking-tight text-center font-light">
          Le origini di &ldquo;Gebrüder Thonet&rdquo;
        </h1>
      </section>

      {/* ── Foto famiglia + testo ─────────────────────────────────── */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto w-[95%] max-w-[90%]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left: family photo */}
            <div className="lg:col-span-5">
              <div className="relative bg-warm-100 overflow-hidden" style={{ aspectRatio: "16 / 11" }}>
                <Image
                  src={imgs["thonet-family"]}
                  alt="Michael Thonet e i suoi cinque figli"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>
            {/* Right: text */}
            <div className="lg:col-span-7 flex flex-col justify-start" style={{ paddingTop: "30px", paddingLeft: "90px", paddingRight: "50px" }}>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                Michael Thonet (1796-1871) e i suoi cinque figli furono i
                produttori di mobili di maggior successo dell&apos;era
                industriale. Invitato dal cancelliere austriaco Metternich, che
                aveva visto i suoi prodotti all&apos;Esposizione della
                Societ&agrave; degli Amici delle Arti di Coblenza, a sviluppare
                il proprio brevetto in Austria, nel 1842 Michael Thonet
                lasci&ograve; Boppard, in Germania, per stabilirsi a Vienna,
                dove nel 1853 fond&ograve; l&apos;azienda &ldquo;Gebrüder
                Thonet&rdquo; coinvolgendo i suoi cinque figli.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── L'innovazione e il successo industriale ───────────────── */}
      <section className="pb-20 md:pb-28">
        <div className="gtv-container">
          <h2 className="font-serif text-[32px] md:text-[44px] text-black leading-[1.15] mb-12 text-center">
            L&apos;innovazione e il successo industriale
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mb-6">
            Nella capitale dell&apos;Impero asburgico, Michael Thonet
            pass&ograve; dalla tecnica del legno lamellare incollato a quella del
            tondino incurvato a vapore, cio&egrave; a un processo chimico e
            meccanico di tipo industriale. Grazie a questa innovazione
            inizi&ograve; a produrre mobili in legno proponendo una collezione di
            forme eleganti e insieme razionali, con un procedimento che consentiva
            la produzione in grande serie. A questo si aggiunse subito, un sistema
            di distribuzione e di vendita in grado di penetrare qualsiasi mercato.
          </p>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mb-16">
            In quel periodo nacquero prodotti come la sedia &ldquo;N.1&rdquo;
            progettata per il famoso palazzo Schwarzenberg di Vienna, considerata
            la sedia &ldquo;tipo&rdquo; Thonet, da cui derivarono poi
            innumerevoli modelli fino alla sedia &ldquo;N.14&rdquo;.
          </p>

          {/* 2 vertical images — slightly wider than paragraph */}
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 gap-6 md:gap-8">
              <div>
                <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
                  <Image
                    src={imgs["sedia-n1"]}
                    alt="Sedia Thonet N.1 — Michael Thonet"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 35vw"
                  />
                </div>
                <p className="text-xs text-warm-400 mt-3 font-light">
                  N. 1 — Michael Thonet
                </p>
              </div>
              <div>
                <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
                  <Image
                    src={imgs["sedia-n4"]}
                    alt="Sedia Thonet N.4 — Michael Thonet"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 35vw"
                  />
                </div>
                <p className="text-xs text-warm-400 mt-3 font-light">
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
            L&apos;espansione e la trasformazione
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-4xl mx-auto mb-16 text-left">
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

        {/* 3 vertical images — bigger, less padding, uniform spacing */}
        <div className="px-4 md:px-6">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
              <Image
                src={imgs["hayworth-kelly"]}
                alt="Rita Hayworth e Gene Kelly"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 33vw"
              />
            </div>
            <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
              <Image
                src={imgs["le-corbusier"]}
                alt="Le Corbusier"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 33vw"
              />
            </div>
            <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
              <Image
                src={imgs["winston-churchill"]}
                alt="Winston Churchill"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 33vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Testo storico + immagine ─────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="gtv-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left: text */}
            <div className="lg:px-6 xl:px-10">
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-8">
                Nel 1911 il catalogo Gebrüder Thonet contava 860 modelli distinti.
                Al termine della seconda guerra mondiale rimasero unit&agrave; di
                produzione indipendenti in varie nazioni che acquistarono il nome
                diversi: in Austria, patria di Gebrüder Thonet, divent&ograve;
                Thonet-Mundus; da alcuni discendenti di Michael Thonet, figli
                Gebrüder Thonet e Richard Thonet. Dopo la guerra, diventava
                ricominciare da capo, con pochi pezzi che una passione e conoscenza
                per i mobili.
              </p>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-8">
                Gebrüder Thonet Vienna nasce proprio dai vecchi magazzini di
                Gebrüder Thonet, a partire dal 1948. Ricostruita, Richard e
                Gebrüder Thonet edificarono un stabilimento a Rethway, Steiermark,
                prima di realizzare il loro sito produttivo a Friedberg in 1952.
              </p>
              <p className="text-[20px] text-black leading-snug font-light tracking-normal">
                Nel 1976 la societ&agrave; cambi&ograve; nome in Gebrüder Thonet
                Vienna.
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
        <div className="mx-auto max-w-5xl px-10 md:px-16 lg:px-20">
          <h2 className="font-serif text-[32px] md:text-[44px] text-black leading-[1.15] mb-12 text-center">
            Gebrüder Thonet Vienna oggi:
            <br />
            tradizione e innovazione
          </h2>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal mb-6 text-left">
            Recentemente Gebrüder Thonet Vienna GmbH (GTV) ha sviluppato la
            propria attivit&agrave; fra tradizione e innovazione,
            continuit&agrave; e rinnovamento, dando vita a un programma di
            produzione articolato, che si propone in primo luogo di recuperare in
            forma di riedizione una serie di oggetti storici creati dalla
            Gebrüder Thonet.
          </p>
          <p className="text-[20px] text-black leading-snug font-light tracking-normal text-left">
            GTV incarna l&apos;arredamento contemporaneo, unendo tradizione e
            innovazione. Tecniche avanzate, materiali innovativi e design
            contemporaneo caratterizzano i suoi progetti, trasformando
            l&apos;eredit&agrave; classica in nuove soluzioni. Icone come la
            sedia N14, con oltre 50 milioni di esemplari prodotti, continuano a
            ispirare. GTV guarda al futuro, reinterpretando il passato per
            creare collezioni attuali e versatili.
          </p>
        </div>
      </section>

      {/* ── La "Moneta" GTV — immagine sx, testo dx, più alta ──── */}
      <section className="w-full bg-warm-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0">
          {/* Left: image — full height */}
          <div className="relative bg-warm-200" style={{ aspectRatio: "4/3" }}>
            <Image
              src={imgs["coin-authenticity"]}
              alt="La Moneta GTV — simbolo di autenticità"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Right: text — same style as Born in Vienna */}
          <div className="px-10 md:px-16 lg:px-20 py-16 lg:py-20 flex flex-col justify-center">
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              La &ldquo;Moneta&rdquo; GTV
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
              L&apos;inimitabile valore, materiale e immateriale nella struttura
              di ogni singolo pezzo: un particolare emblema che ne attesta
              autenticit&agrave;, originalit&agrave; e qualit&agrave; e acquisito
              stabilit&agrave; fra industria e sapiente artigianato, fra
              l&apos;eredit&agrave; del passato e l&apos;esecuzione dettagliata,
              la moneta con l&apos;effigie del marchio, che storicamente si
              apponeva internamente ai siti produttivi Thonet, appare in tutte
              le produzioni.
            </p>
          </div>
        </div>
      </section>

      {/* ── Potrebbe Interessarti Anche ───────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-[90%] max-w-[75%]">
          <h3 className="font-sans text-[28px] text-black leading-[1.15] font-normal uppercase tracking-[inherit] text-center mb-12">
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
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-warm-200" />
                    )}
                  </div>
                  <h4 className="font-sans text-lg md:text-[22px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mt-4">
                    {rp.label}
                  </h4>
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
          <span>Heritage</span>
        </div>
      </div>
    </>
  );
}
