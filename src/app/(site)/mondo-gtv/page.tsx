import Image from "next/image";
import Link from "next/link";
import { getRelatedCardImages } from "@/lib/page-images";

const PAGES = [
  { page: "brand-manifesto", label: "Brand Manifesto", href: "/mondo-gtv/brand-manifesto" },
  { page: "heritage", label: "Heritage", href: "/mondo-gtv/heritage" },
  { page: "curvatura-legno", label: "La Curvatura del Legno", href: "/mondo-gtv/curvatura-legno" },
  { page: "sostenibilita", label: "Sostenibilità", href: "/mondo-gtv/sostenibilita" },
  { page: "designer-e-premi", label: "Designer e Premi", href: "/mondo-gtv/designer-e-premi" },
  { page: "gtv-experience", label: "GTV Experience Interno Marche Design Hotel", href: "/mondo-gtv/gtv-experience" },
];

export default async function MondoGTVPage() {
  const cardImages = await getRelatedCardImages(PAGES.map((p) => p.page));

  return (
    <>
      {/* ── Titolo — stile pagina Prodotti ───────────────────── */}
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <div className="gtv-container">
          <h1 className="font-serif text-[58px] text-black tracking-normal text-center">
            Mondo GTV
          </h1>
        </div>
      </section>

      {/* ── Paragrafo intro — stile pagina Prodotti ──────────── */}
      <section className="pb-16 md:pb-20">
        <div className="gtv-container">
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            Mondo GTV racconta l&apos;identità di Gebrüder Thonet Vienna: una
            tradizione che affonda le radici nella Vienna del XIX secolo e che
            oggi si rinnova attraverso la collaborazione con i più importanti
            studi di design internazionali. Esplora il manifesto del brand, la
            storia dell&apos;azienda, la tecnica della curvatura del legno,
            l&apos;impegno per la sostenibilità, i designer e i premi, fino
            all&apos;esperienza di Interno Marche Design Hotel.
          </p>
        </div>
      </section>

      {/* ── Card delle pagine — stile "Potrebbe interessarti anche" ── */}
      <section className="pb-20 md:pb-28">
        <div className="gtv-container">
          <div className="mx-auto" style={{ maxWidth: "73.5%" }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12">
              {PAGES.map((p) => {
                const coverSrc = cardImages[p.page] || null;
                return (
                  <Link key={p.page} href={p.href} className="group block">
                    <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
                      {coverSrc ? (
                        <Image
                          src={coverSrc}
                          alt={p.label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-warm-200" />
                      )}
                    </div>
                    <h4 className="font-sans text-[22px] md:text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] mt-4">
                      {p.label}
                    </h4>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Breadcrumbs — stile mondo-gtv ────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <span>Mondo GTV</span>
        </div>
      </div>
    </>
  );
}
