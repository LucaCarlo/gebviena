import Image from "next/image";
import Link from "next/link";
import { getPageImages } from "@/lib/page-images";

const DEFAULTS: Record<string, string> = {
  main: "/images/PEERS-design-by-Front-for-GTV-2-1024x768.jpg",
};

export default async function RichiestaInfoPage() {
  const imgs = await getPageImages("richiesta-info", DEFAULTS);

  return (
    <>
      {/* ── Titolo — stile pagina Prodotti ───────────────────── */}
      <section className="pt-20 md:pt-28 pb-16 md:pb-20">
        <div className="gtv-container">
          <h1 className="font-serif text-[58px] text-black tracking-normal text-center">
            Richiesta Informazioni
          </h1>
        </div>
      </section>

      {/* ── Sezione stile "Born in Vienna" — testo sx, immagine dx ── */}
      <section className="w-full bg-warm-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left: text */}
          <div className="flex flex-col justify-center" style={{ padding: "96px 150px" }}>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal">
              Hai domande sui nostri prodotti o servizi? Il nostro team è a tua
              disposizione per fornirti tutte le informazioni di cui hai
              bisogno. Contattaci e saremo lieti di rispondere alle tue
              richieste nel più breve tempo possibile.
            </p>
            <a
              href="mailto:info@gebruederthonetvienna.com"
              className="inline-block mt-8 uppercase text-[16px] tracking-[0.03em] text-black font-medium hover:underline w-fit"
              style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
            >
              Contattaci &rarr;
            </a>
          </div>

          {/* Right: image */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
            <Image
              src={imgs.main}
              alt="Richiesta Informazioni"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ── Breadcrumbs — stile mondo-gtv ────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <Link href="/contatti">Contatti</Link>
          <span>&gt;</span>
          <span>Richiesta Informazioni</span>
        </div>
      </div>
    </>
  );
}
