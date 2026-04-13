import Image from "next/image";
import Link from "next/link";
import { getRelatedCardImages } from "@/lib/page-images";

const PAGES = [
  { page: "cataloghi", label: "Cataloghi", href: "/professionisti/cataloghi" },
  { page: "materiale-tecnico", label: "Materiale Tecnico", href: "/professionisti/materiale-tecnico" },
  { page: "realizzazioni-custom", label: "Realizzazioni Custom", href: "/professionisti/realizzazioni-custom" },
];

export default async function ProfessionistiPage() {
  const cardImages = await getRelatedCardImages(PAGES.map((p) => p.page));

  return (
    <>
      {/* ── Titolo — stile pagina Prodotti ───────────────────── */}
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <div className="gtv-container">
          <h1 className="font-serif text-[58px] text-black tracking-normal text-center">
            Professionisti
          </h1>
        </div>
      </section>

      {/* ── Paragrafo intro — stile pagina Prodotti ──────────── */}
      <section className="pb-16 md:pb-20">
        <div className="gtv-container">
          <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto">
            Gebrüder Thonet Vienna mette a disposizione di architetti, interior
            designer e progettisti gli strumenti per supportare ogni fase del
            lavoro: cataloghi completi della collezione, materiali tecnici per
            la specifica di prodotto e il servizio di realizzazione di soluzioni
            su misura per progetti contract, hospitality e residenziali.
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

      {/* ── Breadcrumbs ──────────────────────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <span>Professionisti</span>
        </div>
      </div>
    </>
  );
}
